import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../ds";
import { registerParity } from "../test/parity";
import { OnboardingKeysStep } from "./OnboardingKeysStep";
import { OnboardingMiningStep, powFieldsValid, type PowFormState } from "./OnboardingMiningStep";
import { OnboardingNetworkStep } from "./OnboardingNetworkStep";
import { OnboardingSetupStep } from "./OnboardingSetupStep";
import { OnboardingWelcome } from "./OnboardingWelcome";
import {
  DEFAULT_CLAIM_TICK_SECONDS,
  DEFAULT_MAX_THREADS,
  DEFAULT_TICKETS_PER_BLOCK,
  type AutoClaimTarget,
  type KeystoreKey,
  type OnboardingBackend,
  type OnboardingMode,
  type OnboardingStep,
  type PowAccount,
  type PowSection,
} from "./onboardingTypes";
import "./onboarding.css";

// Onboarding Stepper chrome (OnboardingView.qml): the advanced-wizard shell — title,
// progress rail, dynamic step stack, and footer (Exit / Back / advance-hint / primary).
registerParity([
  "onboard-stepper",
  "onboard-dynamic-steps",
  "onboard-progress-rail",
  "onboard-footer-exit",
  "onboard-footer-back",
  "onboard-footer-advance",
  "onboard-advance-hint",
]);

const STEP_LABELS: Record<OnboardingStep, string> = {
  setup: "Setup",
  network: "Network",
  keys: "Keys",
  fund: "Fund",
};

const NO_BACKEND = "No backend connected.";

const noopBackend: OnboardingBackend = {
  userConfig: "",
  useGeneratedConfig: false,
  deploymentConfig: "",
  nodeKeystorePath: "",
  keysBackedUp: false,
  bootstrapPeers: [],
  configPowSection: {},
  generatedUserConfigPath: "",
  generateConfig: async () => ({ success: false, error: NO_BACKEND }),
  powConfigure: async () => ({ success: false, error: NO_BACKEND }),
  backupKeystore: async () => ({ success: false, error: NO_BACKEND }),
  getKeystoreKeys: async () => ({ success: true, value: [] }),
  getConfigWalletKeys: async () => ({ success: true, value: [] }),
};

function initPow(sec: PowSection): PowFormState {
  let autoThreads = false;
  let threads = String(DEFAULT_MAX_THREADS);
  if (sec.max_threads === null) {
    autoThreads = true;
  } else if (typeof sec.max_threads === "number") {
    threads = String(sec.max_threads);
  }
  return {
    autoThreads,
    threads,
    tickets: sec.max_tickets_per_block
      ? String(sec.max_tickets_per_block)
      : String(DEFAULT_TICKETS_PER_BLOCK),
    tick: sec.tick_seconds ? String(sec.tick_seconds) : String(DEFAULT_CLAIM_TICK_SECONDS),
  };
}

export interface OnboardingFlowProps {
  /** The injected GUI-process backend. Omitted = a disconnected no-op (P1 default). */
  backend?: OnboardingBackend;
  /** Configure a NEW node (skips Welcome + Setup; starts at Network). */
  newNode?: boolean;
  /** A usable config already exists, so setup can be abandoned (Exit shown). */
  canExit?: boolean;
  onFinished?: (startNode: boolean) => void;
  onExitRequested?: () => void;
  onKeystoreSaved?: (path: string) => void;
}

export function OnboardingFlow({
  backend = noopBackend,
  newNode = false,
  canExit = false,
  onFinished,
  onExitRequested,
  onKeystoreSaved,
}: OnboardingFlowProps) {
  // --- Flow state ---------------------------------------------------------
  const [mode, setMode] = useState<OnboardingMode>("generate");
  const [stepIndex, setStepIndex] = useState<number>(newNode ? 0 : -1);
  const [generatedThisRun, setGeneratedThisRun] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [error, setError] = useState("");

  const [userConfigPath, setUserConfigPath] = useState(backend.userConfig);
  const [deploymentConfigPath, setDeploymentConfigPath] = useState(backend.deploymentConfig);
  const [keystoreKeys, setKeystoreKeys] = useState<KeystoreKey[]>([]);
  const [powAccounts, setPowAccounts] = useState<PowAccount[]>([]);

  // Network step
  const [custom, setCustom] = useState(false);
  const [customDeploymentPath, setCustomDeploymentPath] = useState("");
  const [peersText, setPeersText] = useState(() => backend.bootstrapPeers.join("\n"));

  // Keys step
  const [acknowledged, setAcknowledged] = useState(false);

  // Fund step
  const existingTargets = backend.configPowSection.auto_claim_targets ?? [];
  const [autoClaimOn, setAutoClaimOn] = useState(true);
  const [targets, setTargets] = useState<AutoClaimTarget[]>(() => existingTargets);
  const [pow, setPow] = useState<PowFormState>(() => initPow(backend.configPowSection));

  // --- Load keys + accounts for a config path ----------------------------
  const loadConfig = useCallback(
    async (path: string) => {
      if (!path) {
        setKeystoreKeys([]);
        setPowAccounts([]);
        return;
      }
      const [keysRes, acctRes] = await Promise.all([
        backend.getKeystoreKeys(path),
        backend.getConfigWalletKeys(path),
      ]);
      setKeystoreKeys(keysRes.success ? keysRes.value ?? [] : []);
      setPowAccounts(acctRes.success ? acctRes.value ?? [] : []);
    },
    [backend],
  );

  // begin(): on mount, if a config already exists, load its keys + accounts.
  useEffect(() => {
    if (backend.userConfig.length > 0) void loadConfig(backend.userConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Derived step set + flags ------------------------------------------
  const steps: OnboardingStep[] = useMemo(() => {
    if (newNode) return ["network", "keys", "fund"];
    return mode === "existing" ? ["setup"] : ["setup", "network", "keys", "fund"];
  }, [newNode, mode]);

  const step: OnboardingStep | "welcome" =
    stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : "welcome";

  const configExists =
    (backend.useGeneratedConfig && backend.userConfig.length > 0) || generatedThisRun;
  const configWritten = newNode ? generatedThisRun : configExists;
  const canGoBack = newNode ? stepIndex > 0 : stepIndex > -1;

  const bootstrapPeers = backend.bootstrapPeers;
  const quickStartAvailable = bootstrapPeers.length > 0;

  const networkPeers = useMemo(
    () =>
      peersText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [peersText],
  );
  const needsDeployment = custom && customDeploymentPath.trim().length === 0;
  const needsPeers = networkPeers.length === 0;
  const networkValid = !needsDeployment && !needsPeers;

  const keysAcknowledged = backend.keysBackedUp || acknowledged;
  const fundNeedsTarget = autoClaimOn && targets.length === 0;
  const fundValid = powFieldsValid(pow) && !fundNeedsTarget;

  // --- Config generation --------------------------------------------------
  const generate = useCallback(
    async (quickStart: boolean) => {
      setBusy(true);
      setBusyMessage(quickStart ? "Setting up your node…" : "Generating…");
      setError("");
      const peers = quickStart ? bootstrapPeers : networkPeers;
      try {
        const result = await backend.generateConfig({
          outputPath: "",
          initialPeers: peers,
          deploymentMode: !quickStart && custom ? 1 : 0,
          deploymentConfigPath: !quickStart && custom ? customDeploymentPath.trim() : "",
          newNode,
          quickStart,
        });
        setBusy(false);
        setBusyMessage("");
        if (!result.success) {
          setError(result.error || "Could not generate a config.");
          return;
        }
        const resolved =
          result.value && result.value !== ""
            ? result.value
            : backend.generatedUserConfigPath || "";
        setUserConfigPath(resolved);
        setGeneratedThisRun(true);
        await loadConfig(resolved);
        if (quickStart) {
          onFinished?.(true);
          return;
        }
        setStepIndex(steps.indexOf("keys"));
      } catch (e) {
        setBusy(false);
        setBusyMessage("");
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [
      backend,
      bootstrapPeers,
      networkPeers,
      custom,
      customDeploymentPath,
      newNode,
      loadConfig,
      onFinished,
      steps,
    ],
  );

  // --- Submit pow section (Fund step) ------------------------------------
  const submitPow = useCallback(async () => {
    setBusy(true);
    setBusyMessage("Saving…");
    setError("");
    const cfg = {
      max_threads: pow.autoThreads ? null : Number.parseInt(pow.threads, 10),
      max_tickets_per_block: Number.parseInt(pow.tickets, 10),
      tick_seconds: Number.parseInt(pow.tick, 10),
      auto_claim_targets: autoClaimOn ? targets : [],
    };
    try {
      const result = await backend.powConfigure(userConfigPath, JSON.stringify(cfg));
      setBusy(false);
      setBusyMessage("");
      if (result.success) onFinished?.(true);
      else setError(result.error || "Could not save the mining settings.");
    } catch (e) {
      setBusy(false);
      setBusyMessage("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [backend, pow, autoClaimOn, targets, userConfigPath, onFinished]);

  // --- Keystore download --------------------------------------------------
  const downloadKeystore = useCallback(async () => {
    setError("");
    let dest = "keystore.yaml";
    if (backend.saveDialog) {
      const picked = await backend.saveDialog("keystore.yaml");
      if (!picked) return;
      dest = picked;
    }
    try {
      const result = await backend.backupKeystore(dest);
      if (result.success) onKeystoreSaved?.(result.value || dest);
      else setError(result.error || "Backup failed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [backend, onKeystoreSaved]);

  // --- Browse helpers -----------------------------------------------------
  const browseUserConfig = useCallback(async () => {
    const picked = await backend.browse?.("userConfig");
    if (picked) {
      setUserConfigPath(picked);
      void loadConfig(picked);
    }
  }, [backend, loadConfig]);
  const browseSetupDeployment = useCallback(async () => {
    const picked = await backend.browse?.("deployment");
    if (picked) setDeploymentConfigPath(picked);
  }, [backend]);
  const browseNetworkDeployment = useCallback(async () => {
    const picked = await backend.browse?.("deployment");
    if (picked) setCustomDeploymentPath(picked);
  }, [backend]);

  // --- Footer transitions -------------------------------------------------
  const back = () => {
    if (canGoBack) setStepIndex((i) => i - 1);
  };

  const advance = () => {
    switch (step) {
      case "setup":
        if (mode === "existing") onFinished?.(true);
        else setStepIndex((i) => i + 1);
        break;
      case "network":
        if (configWritten) setStepIndex((i) => i + 1);
        else void generate(false);
        break;
      case "keys":
        setStepIndex((i) => i + 1);
        break;
      case "fund":
        void submitPow();
        break;
    }
  };

  const canAdvance = (() => {
    if (busy) return false;
    switch (step) {
      case "setup":
        return mode === "generate" || (mode === "existing" && userConfigPath.length > 0);
      case "network":
        return configWritten || networkValid;
      case "keys":
        return keysAcknowledged;
      case "fund":
        return fundValid;
      default:
        return true;
    }
  })();

  const advanceHint = (() => {
    if (busy || canAdvance) return "";
    switch (step) {
      case "setup":
        return mode === "existing"
          ? "Choose your user config to continue"
          : "Pick how you want to start";
      case "network":
        if (configWritten) return "";
        if (needsDeployment) return "Choose a deployment file to continue";
        if (needsPeers) return "Add at least one bootstrap peer to continue";
        return "";
      case "keys":
        return "Confirm you saved your keys to continue";
      case "fund":
        return fundNeedsTarget
          ? "Add an account for auto-claim to pay, or switch it off"
          : "";
      default:
        return "";
    }
  })();

  const advanceText = (() => {
    if (busy) return busyMessage || "Working…";
    switch (step) {
      case "setup":
        return mode === "existing" ? "Start node" : "Continue";
      case "network":
        return configWritten ? "See your keys" : "Generate config";
      case "fund":
        return "Start node";
      default:
        return "Continue";
    }
  })();

  // --- Welcome ------------------------------------------------------------
  if (step === "welcome") {
    return (
      <section className="onboarding-flow" data-testid="onboarding-flow">
        <OnboardingWelcome
          busy={busy}
          busyMessage={busyMessage}
          errorMessage={error}
          quickStartAvailable={quickStartAvailable}
          onQuickStart={() => void generate(true)}
          onAdvanced={() => setStepIndex(0)}
        />
      </section>
    );
  }

  // --- Stepper ------------------------------------------------------------
  const stepError = (s: OnboardingStep) => (step === s ? error : "");

  return (
    <section className="onboarding-flow" data-testid="onboarding-flow">
      <div className="onboarding-stepper" data-testid="onboarding-stepper">
        <div>
          <h2 className="onboarding-stepper__title" data-testid="onboarding-step-title">
            Set up your node
          </h2>
          <p className="onboarding-stepper__subtitle">
            Advanced setup — configure and secure your node.
          </p>
        </div>

        {steps.length > 1 && (
          <div className="onboarding-rail" data-testid="onboarding-step-rail" role="list">
            {steps.map((s, i) => (
              <div
                key={s}
                role="listitem"
                aria-current={i === stepIndex ? "step" : undefined}
                className={[
                  "onboarding-rail__step",
                  i < stepIndex && "onboarding-rail__step--done",
                  i === stepIndex && "onboarding-rail__step--current",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="onboarding-rail__bar" />
                <span className="onboarding-rail__label">
                  {i + 1}. {STEP_LABELS[s]}
                </span>
              </div>
            ))}
          </div>
        )}

        {step === "setup" && (
          <OnboardingSetupStep
            mode={mode}
            onModePicked={setMode}
            userConfigPath={userConfigPath}
            onUserConfigPathChange={setUserConfigPath}
            deploymentConfigPath={deploymentConfigPath}
            onDeploymentConfigPathChange={setDeploymentConfigPath}
            onBrowseUserConfig={browseUserConfig}
            onBrowseDeployment={browseSetupDeployment}
            errorMessage={stepError("setup")}
          />
        )}
        {step === "network" && (
          <OnboardingNetworkStep
            locked={configWritten}
            userConfigPath={userConfigPath}
            custom={custom}
            onCustomChange={setCustom}
            customDeploymentPath={customDeploymentPath}
            onCustomDeploymentPathChange={setCustomDeploymentPath}
            onBrowseDeployment={browseNetworkDeployment}
            peersText={peersText}
            onPeersTextChange={setPeersText}
            needsDeployment={needsDeployment}
            needsPeers={needsPeers}
            errorMessage={stepError("network")}
          />
        )}
        {step === "keys" && (
          <OnboardingKeysStep
            keys={keystoreKeys}
            keystorePath={backend.nodeKeystorePath}
            alreadyBackedUp={backend.keysBackedUp}
            acknowledged={acknowledged}
            onAcknowledgeChange={setAcknowledged}
            onDownload={downloadKeystore}
            errorMessage={stepError("keys")}
          />
        )}
        {step === "fund" && (
          <OnboardingMiningStep
            accounts={powAccounts}
            autoClaimOn={autoClaimOn}
            onAutoClaimChange={setAutoClaimOn}
            targets={targets}
            onAddTarget={(t) => setTargets((prev) => [...prev, t])}
            onRemoveTarget={(i) => setTargets((prev) => prev.filter((_, idx) => idx !== i))}
            pow={pow}
            onPowChange={setPow}
            busy={busy}
            errorMessage={stepError("fund")}
          />
        )}

        <div className="onboarding-footer" data-testid="onboarding-footer">
          {canExit && (
            <Button data-testid="onboarding-exit-button" disabled={busy} onClick={onExitRequested}>
              Exit
            </Button>
          )}
          {canGoBack && (
            <Button data-testid="onboarding-back-button" disabled={busy} onClick={back}>
              Back
            </Button>
          )}
          <span className="onboarding-footer__spacer" />
          {advanceHint && (
            <span className="onboarding-advance-hint" data-testid="onboarding-advance-hint">
              {advanceHint}
            </span>
          )}
          <Button
            variant="primary"
            data-testid="onboarding-advance-button"
            disabled={!canAdvance}
            onClick={advance}
          >
            {advanceText}
          </Button>
        </div>
      </div>
    </section>
  );
}

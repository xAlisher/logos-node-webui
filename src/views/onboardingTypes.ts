// Shared types + constants for the Onboarding flow (issue #4) — a faithful web
// replica of the official logos-blockchain-ui first-run wizard (OnboardingView.qml
// and its steps). Config generation, keystore backup and key listing are
// GUI-process backend operations in the native app (not node HTTP endpoints), so
// the flow talks to an injected `OnboardingBackend` exactly as the QML takes a
// `backend` object. The node-facing mutations live in src/api/endpoints.ts and are
// triggered by the shell once the flow calls `onFinished(startNode)`.

/** Mirror of the native `logos.watch` result envelope. */
export interface BackendResult<T> {
  success: boolean;
  value?: T;
  error?: string;
}

/** One keystore key row ({ address, label }) listed on the Keys step. */
export interface KeystoreKey {
  address: string;
  label?: string;
}

/** One wallet-key account the Fund step's pickers read ({ address, roles, roleLabel, label }). */
export interface PowAccount {
  address: string;
  roles?: string;
  roleLabel?: string;
  label?: string;
}

/** An auto-claim target as `powConfigure` takes it. */
export interface AutoClaimTarget {
  public_key: string;
  threshold: string;
}

/** The node's `pow` config section — written whole by one powConfigure call. */
export interface PowSection {
  max_threads?: number | null;
  max_tickets_per_block?: number;
  tick_seconds?: number;
  auto_claim_targets?: AutoClaimTarget[];
}

/** Arguments to generate a user config (the subset the web replica surfaces). */
export interface GenerateConfigArgs {
  /** Output path ("" = backend default). */
  outputPath: string;
  /** Bootstrap multiaddrs to dial on start. */
  initialPeers: string[];
  /** 0 = shipped/default deployment, 1 = custom deployment file. */
  deploymentMode: number;
  /** Path to the custom deployment config (when deploymentMode === 1). */
  deploymentConfigPath: string;
  /** Create a NEW node in its own directory rather than configure the only one. */
  newNode: boolean;
  /** True when generate was triggered from Welcome's Quick start (finishes the flow). */
  quickStart: boolean;
}

/**
 * The injected backend, mirroring the QML `backend` object the wizard drives.
 * Property getters are read once when the flow mounts; the async methods return
 * the `logos.watch` result envelope. Tests pass a mock implementation.
 */
export interface OnboardingBackend {
  readonly userConfig: string;
  readonly useGeneratedConfig: boolean;
  readonly deploymentConfig: string;
  readonly nodeKeystorePath: string;
  readonly keysBackedUp: boolean;
  readonly bootstrapPeers: string[];
  readonly configPowSection: PowSection;
  readonly generatedUserConfigPath: string;

  generateConfig(args: GenerateConfigArgs): Promise<BackendResult<string>>;
  powConfigure(configPath: string, configJson: string): Promise<BackendResult<void>>;
  backupKeystore(destinationPath: string): Promise<BackendResult<string>>;
  getKeystoreKeys(configPath: string): Promise<BackendResult<KeystoreKey[]>>;
  getConfigWalletKeys(configPath: string): Promise<BackendResult<PowAccount[]>>;

  /** Open a file picker for an existing path (Browse buttons). Optional. */
  browse?(kind: "userConfig" | "deployment"): Promise<string | null>;
  /** Open a save dialog for the keystore copy (Download button). Optional. */
  saveDialog?(suggestedName: string): Promise<string | null>;
}

// --- Fund-step defaults (from PowConfigView.qml / PowAutoClaimTargets.qml) ---

/** Threshold sentinel meaning "pay this account with no upper limit". */
export const NO_CAP_THRESHOLD = "18446744073709551615";
/** Default target balance prefilled into the threshold field. */
export const DEFAULT_THRESHOLD = "100000000";
/** Default mining knobs (the node's own defaults). */
export const DEFAULT_MAX_THREADS = 1;
export const DEFAULT_TICKETS_PER_BLOCK = 2;
export const DEFAULT_CLAIM_TICK_SECONDS = 300;

/** The four wizard step ids, in order. */
export type OnboardingStep = "setup" | "network" | "keys" | "fund";
/** Where the config comes from (Setup step). */
export type OnboardingMode = "generate" | "existing";

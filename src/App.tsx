import { Shell } from "./shell/Shell";
import { useLiveShellModel } from "./shell/useLiveShellModel";
import { startMining, stopMining } from "./api/endpoints";
import { getLeaderClaimVouchers } from "./api/endpoints";
import { CapabilitiesProvider, WEB_CAPS } from "./deploy/capabilities";

// The app renders the shell (BlockchainView.qml replica): header + section tab bar +
// the active-tab stack.
//
// This is the WEB/HTTP-only deployment (served by the DAppNode package). It:
//   • feeds the shell a LIVE backend model from the node monitor, so the header and
//     every node-dependent view reflect the real node status (Online / catching up /
//     offline) instead of the never-connected default;
//   • declares WEB_CAPS, so native-only affordances (start/stop node, config file
//     pickers, keystore file download, CPU/RAM/disk sampling) are hidden — the node
//     here is managed by its host (the container), not by this UI;
//   • wires the controls that DO have HTTP endpoints: mining on/off and the coalesced
//     voucher refresh. Node start/stop are intentionally absent (no HTTP endpoint).
export function App() {
  const model = useLiveShellModel();
  return (
    <CapabilitiesProvider value={WEB_CAPS}>
      <Shell
        model={model}
        deps={{
          startMining,
          stopMining,
          fetchVouchers: getLeaderClaimVouchers,
        }}
      />
    </CapabilitiesProvider>
  );
}

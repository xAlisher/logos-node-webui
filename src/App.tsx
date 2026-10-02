import { Shell } from "./shell/Shell";

// The app renders the shell (BlockchainView.qml replica): header + section tab bar +
// the active-tab stack. The shell is self-contained for P1 (no src/ds or src/api
// imports yet); live backend state, onboarding routing, and DS components wire in at P2.
export function App() {
  return <Shell />;
}

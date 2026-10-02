import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// The single info dialog opened by every LogosInfoButton (views/InfoSections.qml).
// Four sections (WHAT IS IT / HOW IT'S CALCULATED / STATES / DOCS), content keyed by one
// of 29 topics in infoContent.js. P2 owns parity-checklist.json "view": "Info Dialog"
// plus the per-topic coverage. The Voucher Dialog ("view": "Voucher Dialog") rides with
// Rewards. Config Upgrade Dialog is a separate global-dialog stub (P2).
registerParity([
  // TODO(P2): "info-dialog-*" ids (+ the 29 info topics)
]);

export function InfoDialog() {
  return <ViewStub id="info-dialog" title="Info Dialog" />;
}

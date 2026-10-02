// Deployment capabilities — what the host environment can actually do.
//
// The official desktop app manages a local node *subprocess* and the *filesystem*,
// so it can start/stop the node, pick config files, download the keystore, and
// sample the node process's CPU/RAM/disk. The web build (served by the DAppNode
// package, or any HTTP-only deployment) has ONLY the node's HTTP API — there is no
// start/stop endpoint, no filesystem, and no process sampling. Showing those
// controls there just gives the operator dead buttons.
//
// Capabilities gate the *rendering* of those affordances. They do NOT change which
// parity ids a view registers (that happens at import, so the 225-id gate is
// unaffected) — only whether a given control is shown in a given deployment.
//
// Default = the native profile (everything on), so every unit test and the
// standalone replica render the full surface with no provider needed. The web
// build wraps the app in WEB_CAPS.

import { createContext, useContext } from "react";

export interface Capabilities {
  /** The node is a managed subprocess we can start/stop (native only). */
  nodeLifecycle: boolean;
  /** OS file pickers, keystore file download, config-path editing (native only). */
  fileSystem: boolean;
  /** The node process's CPU / RAM / disk are sampled and reported (native only). */
  resourceSampling: boolean;
}

/** Desktop app: full control. The default so tests/replica render everything. */
export const NATIVE_CAPS: Capabilities = {
  nodeLifecycle: true,
  fileSystem: true,
  resourceSampling: true,
};

/** HTTP-only (DAppNode package / any web serve): only what the node API exposes. */
export const WEB_CAPS: Capabilities = {
  nodeLifecycle: false,
  fileSystem: false,
  resourceSampling: false,
};

const CapabilitiesContext = createContext<Capabilities>(NATIVE_CAPS);

export const CapabilitiesProvider = CapabilitiesContext.Provider;

export function useCapabilities(): Capabilities {
  return useContext(CapabilitiesContext);
}

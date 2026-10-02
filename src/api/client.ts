// Thin typed client over the node HTTP API. All calls go through the `/api` prefix,
// which the Vite dev server proxies to the node (sneg via ssh tunnel in dev; the node
// service in the DAppNode package in prod). See docs/spec/api-map.md for the full map.

const BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  // Mutating calls (transfers, mining start/stop, etc.) are added per the api-map spec
  // with explicit, typed request bodies and guarded UI confirmation.
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body == null ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body == null ? undefined : JSON.stringify(body) }),
};

// Known read endpoints the shell needs immediately (full typing lands with the api-map).
export interface CryptarchiaInfo {
  cryptarchia_info: { lib: string; lib_slot: number; tip: string; slot: number; height: number; state: string };
  phase: string;
}
export const getCryptarchiaInfo = () => api.get<CryptarchiaInfo>("/cryptarchia/info");

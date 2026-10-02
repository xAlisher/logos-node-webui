import { afterEach, describe, expect, test, vi } from "vitest";
import { ApiError, api, buildQuery } from "./client";

afterEach(() => vi.restoreAllMocks());

function mockFetch(body: unknown, status = 200) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(text, { status }));
}

describe("api transport", () => {
  test("get hits the /api prefix and parses JSON", async () => {
    const f = mockFetch({ ok: 1 });
    const out = await api.get<{ ok: number }>("/thing");
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe("/api/thing");
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBeUndefined(); // GET default
    expect(out).toEqual({ ok: 1 });
  });

  test("post serializes the body, sets method + content-type", async () => {
    const f = mockFetch({ hash: "abc" });
    const out = await api.post<{ hash: string }>("/do", { a: 1 });
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(out).toEqual({ hash: "abc" });
  });

  test("put without a body sends no body", async () => {
    const f = mockFetch("");
    await api.put<void>("/pow/mining/start");
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PUT");
    expect(init.body).toBeUndefined();
  });

  test("empty response body parses to undefined", async () => {
    mockFetch("");
    const out = await api.get<undefined>("/empty");
    expect(out).toBeUndefined();
  });

  test("non-2xx throws ApiError carrying status + body", async () => {
    mockFetch("missing field slot_from", 400);
    await expect(api.get("/cryptarchia/blocks")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "missing field slot_from",
    });
  });

  test("ApiError falls back to statusText when body is empty", async () => {
    mockFetch("", 500);
    const err = await api.get("/boom").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
  });
});

describe("buildQuery", () => {
  test("returns empty string for nothing set", () => {
    expect(buildQuery()).toBe("");
    expect(buildQuery({ a: undefined, b: null })).toBe("");
  });

  test("drops undefined/null and encodes the rest", () => {
    expect(buildQuery({ slot_from: 1, slot_to: 5, sort: undefined })).toBe("?slot_from=1&slot_to=5");
  });
});

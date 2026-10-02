import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { streamBlocks, streamLib } from "./endpoints";

// jsdom has no EventSource — install a controllable fake.
class FakeEventSource {
  static last: FakeEventSource | null = null;
  url: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }
  close() {
    this.closed = true;
  }
  /** test helper: push a raw SSE data frame */
  emit(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }
  emitError(err: unknown) {
    this.onerror?.(err);
  }
}

beforeEach(() => {
  FakeEventSource.last = null;
  vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
});
afterEach(() => vi.unstubAllGlobals());

describe("SSE stream helpers", () => {
  test("streamBlocks opens the blocks stream on the /api prefix and parses frames", () => {
    const seen: unknown[] = [];
    const es = streamBlocks({ onMessage: (b) => seen.push(b) }) as unknown as FakeEventSource;
    expect(es.url).toBe("/api/cryptarchia/events/blocks/stream");
    es.emit(JSON.stringify({ header: { id: "abc", slot: 1 } }));
    expect(seen).toEqual([{ header: { id: "abc", slot: 1 } }]);
  });

  test("streamLib opens the lib stream and parses frames", () => {
    const seen: unknown[] = [];
    const es = streamLib({ onMessage: (u) => seen.push(u) }) as unknown as FakeEventSource;
    expect(es.url).toBe("/api/cryptarchia/lib-stream");
    es.emit(JSON.stringify({ lib: "deadbeef", lib_slot: 173060 }));
    expect(seen).toEqual([{ lib: "deadbeef", lib_slot: 173060 }]);
  });

  test("bad JSON on a frame routes to onError, not onMessage", () => {
    const onMessage = vi.fn();
    const onError = vi.fn();
    const es = streamBlocks({ onMessage, onError }) as unknown as FakeEventSource;
    es.emit("{not json");
    expect(onMessage).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test("transport errors route to onError", () => {
    const onError = vi.fn();
    const es = streamLib({ onMessage: () => {}, onError }) as unknown as FakeEventSource;
    es.emitError(new Error("down"));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test("returns a handle that can be closed", () => {
    const es = streamBlocks({ onMessage: () => {} }) as unknown as FakeEventSource;
    es.close();
    expect(es.closed).toBe(true);
  });
});

import { useEffect, useRef, useState } from "react";

import { getBlocksRange, getTimeInfo, streamBlocks } from "../../api/endpoints";
import type { TimeInfo } from "../../api/types";
import { parseBlock, type BlockRow } from "./blockModel";

/** Max rows the model retains — the official keeps the latest 100, newest first. */
const MAX_BLOCKS = 100;

export type BlockModelStatus = "off" | "loading" | "ready";

export interface BlockModel {
  blocks: BlockRow[];
  status: BlockModelStatus;
}

/**
 * useBlockModel — seeds the block list from `/cryptarchia/blocks_range` (latest
 * 100, newest first) and subscribes to the `/cryptarchia/events/blocks/stream`
 * SSE feed for live blocks, exactly as BlocksView/BlockModel do. New blocks are
 * prepended and the list is capped at 100.
 *
 * When `nodeRunning` is false the model reports "off" and does no I/O.
 */
export function useBlockModel(nodeRunning: boolean): BlockModel {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [status, setStatus] = useState<BlockModelStatus>("off");
  const timeRef = useRef<TimeInfo | null>(null);

  useEffect(() => {
    if (!nodeRunning) {
      setStatus("off");
      setBlocks([]);
      return;
    }

    let cancelled = false;
    let es: EventSource | null = null;
    setStatus("loading");

    const prepend = (raw: unknown) => {
      const row = parseBlock(raw, timeRef.current);
      setBlocks((prev) => {
        // De-dupe by id (the SSE feed can echo a block already seeded).
        const next = row.id ? prev.filter((b) => b.id !== row.id) : prev;
        return [row, ...next].slice(0, MAX_BLOCKS);
      });
    };

    (async () => {
      try {
        timeRef.current = await getTimeInfo();
      } catch {
        /* timestamps just stay blank without /time/info */
      }
      try {
        const seed = await getBlocksRange({ sort: "desc", limit: MAX_BLOCKS });
        if (cancelled) return;
        const rows = (Array.isArray(seed) ? seed : []).map((b) => parseBlock(b, timeRef.current));
        setBlocks(rows.slice(0, MAX_BLOCKS));
      } catch {
        if (!cancelled) setBlocks([]);
      } finally {
        if (!cancelled) setStatus("ready");
      }

      if (cancelled) return;
      try {
        es = streamBlocks({ onMessage: (b) => prepend(b) });
      } catch {
        /* no live feed — the seeded list still shows */
      }
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [nodeRunning]);

  return { blocks, status };
}

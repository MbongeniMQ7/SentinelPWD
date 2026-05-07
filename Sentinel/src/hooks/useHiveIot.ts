import { useEffect, useRef, useState } from "react";

export interface HiveIotData {
  bpm: number;
  state: string;
  baseline: number;
  normalLow: number;
  normalHigh: number;
  tiredThresh: number;
  panicThresh: number;
  fatigueThresh: number;
  learning: boolean;
}

export type HiveConnectionStatus = "connecting" | "connected" | "error" | "offline";

interface UseHiveIotOptions {
  /** Polling interval in milliseconds. Default: 2000 */
  interval?: number;
}

interface UseHiveIotResult {
  data: HiveIotData | null;
  status: HiveConnectionStatus;
  error: string | null;
}

const API_URL = "/hive-api";

export function useHiveIot(options: UseHiveIotOptions = {}): UseHiveIotResult {
  const { interval = 2000 } = options;

  const [data, setData] = useState<HiveIotData | null>(null);
  const [status, setStatus] = useState<HiveConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let destroyed = false;

    async function poll() {
      if (destroyed) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(API_URL, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: HiveIotData = await res.json();
        console.log("[HiveIoT] data:", json);

        if (!destroyed) {
          setData(json);
          setStatus("connected");
          setError(null);
        }
      } catch (err: unknown) {
        if (destroyed) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setStatus("error");
        setError(msg);
      }

      if (!destroyed) {
        timerRef.current = setTimeout(poll, interval);
      }
    }

    poll();

    return () => {
      destroyed = true;
      abortRef.current?.abort();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [interval]);

  return { data, status, error };
}

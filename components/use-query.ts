"use client";

import { useEffect, useState } from "react";

import { useInspector } from "@/components/inspector";
import type { Result } from "@/lib/trace";

type State<T> = { status: "loading" } | { status: "ok"; data: T } | { status: "error"; code: string; message: string };

/** Load a query once per key: from the session cache when it is there, from the API otherwise. */
export function useQuery<T>(key: string | null, label: string, action: () => Promise<Result<T>>): State<T> {
  const { run, cached, generation } = useInspector();
  const [state, setState] = useState<State<T>>({ status: "loading" });

  useEffect(() => {
    if (!key) return;
    const hit = cached<T>(key);
    if (hit?.ok) {
      setState({ status: "ok", data: hit.data });
      return;
    }
    let live = true;
    setState({ status: "loading" });
    void run(key, label, action).then((result) => {
      if (!live) return;
      setState(result.ok ? { status: "ok", data: result.data } : { status: "error", ...result.error });
    });
    return () => {
      live = false;
    };
    // The key names everything the action depends on.
  }, [key, generation]);

  return state;
}

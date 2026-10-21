/** One API call as the inspector shows it. Built on the server, rendered in the browser. */
export interface Trace {
  id: string;
  at: string;
  method: "POST" | "GET" | "DELETE";
  path: string;
  body: unknown;
  status: number;
  ms: number;
  response: string;
  demo: boolean;
}

export type Result<T> =
  | { ok: true; data: T; trace: Trace }
  | { ok: false; error: { code: string; message: string }; trace: Trace | null };

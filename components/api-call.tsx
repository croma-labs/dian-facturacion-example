/** The request a step makes, shown as the code a developer would write. */
export function ApiCall({ path, body, note }: { path: string; body: Record<string, unknown>; note?: string }) {
  const json = JSON.stringify(body, null, 2).replace(/\n/g, "\n  ");
  const code = `await fetch("https://api.croma.run${path}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CROMA_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${json}),
});`;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink text-[12.5px] leading-relaxed text-white/90">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 font-mono text-[11px] text-white/50">
        <span>POST {path}</span>
        <span>servidor</span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono">
        <code>{code}</code>
      </pre>
      {note ? <p className="border-t border-white/10 px-4 py-2 text-[12px] text-white/60">{note}</p> : null}
    </div>
  );
}

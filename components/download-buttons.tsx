"use client";

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function DownloadButtons({ name, xml, pdfBase64 }: { name: string; xml: string | null; pdfBase64: string | null }) {
  return (
    <div className="flex gap-2">
      {pdfBase64 ? (
        <button
          onClick={() => save(`${name}.pdf`, new Blob([Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))], { type: "application/pdf" }))}
          className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white"
        >
          Descargar PDF
        </button>
      ) : null}
      {xml ? (
        <button onClick={() => save(`${name}.xml`, new Blob([xml], { type: "application/xml" }))} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium">
          Descargar XML
        </button>
      ) : null}
    </div>
  );
}

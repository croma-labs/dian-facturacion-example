import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Facturación DIAN con Croma",
  description: "Ejemplo: conecta una cuenta de facturación electrónica de la DIAN y consulta sus facturas emitidas y recibidas con la API de Croma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-block size-5 rounded bg-ink" />
              Facturación DIAN
            </Link>
            <a href="https://docs.croma.run/guides/colombia/dian-facturacion" className="text-sm text-muted hover:text-ink">
              Documentación
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted">
          Ejemplo de código abierto construido con la API de{" "}
          <a href="https://usecroma.com" className="underline">
            Croma
          </a>
          .
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description = "Conecta una cuenta de facturación electrónica de la DIAN y explora sus facturas emitidas y recibidas, el XML y el PDF de cada una, el reporte mensual y el perfil, con la API de Croma.";

export const metadata: Metadata = {
  title: "DIAN Playground · Croma",
  description,
  openGraph: { title: "DIAN Playground · Croma", description, siteName: "Croma" },
  twitter: { card: "summary_large_image", title: "DIAN Playground · Croma", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-left" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QnoTPillenAI · Humaniza Textos | Elimina Rastro de IA | Análisis Documental",
  description:
    "Transforma el contenido generado por IA en prosa natural e indetectable. Sube un PDF, DOC o DOCX, comprueba si parece escrito por IA y reescríbelo con estilo humano. Exporta en DOCX, PDF o TXT con metadatos limpios.",
  keywords: [
    "humanizador de texto",
    "eliminar rastro IA",
    "detector de IA",
    "análisis documental",
    "GPTZero",
    "PDF",
    "DOCX",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

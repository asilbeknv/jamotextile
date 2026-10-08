import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Onest, Unbounded } from "next/font/google";
import "./globals.css";

const body = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "700"], variable: "--font-display" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "cyrillic"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "JAMO Textile", template: "%s · JAMO Textile" },
  description: "Корпоративная одежда с вашим логотипом: макет, заказ и контроль пошива онлайн.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

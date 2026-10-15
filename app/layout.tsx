import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "המתורגמן לזוגיות",
  description: "תכתוב מה היא אמרה. תשרוד את מה שהיא התכוונה.",
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.className} bg-zinc-950 antialiased`}>{children}</body>
    </html>
  );
}

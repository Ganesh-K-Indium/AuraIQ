import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURA Wealth IQ | Enterprise Agentic RAG Platform",
  description: "Autonomous Universal Risk & Advisory for Wealth Management — Powered by FIBO Knowledge Graph & Databricks Unity Catalog",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070a12] text-slate-100 min-h-screen antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}

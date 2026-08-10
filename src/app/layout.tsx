import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBA英語ブラッシュアップ",
  description: "ディクテーション・瞬間英作文でMBAレベルの英語力を鍛えるWebアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Link href="/" className="block">
              <h1 className="text-lg font-bold text-slate-100">MBA英語ブラッシュアップ</h1>
              <p className="text-xs text-slate-400">ディクテーション・瞬間英作文(Web版)</p>
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 w-full flex-1">{children}</main>
      </body>
    </html>
  );
}

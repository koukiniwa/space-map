import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://space-map-git-main-koukiniwas-projects.vercel.app"

export const metadata: Metadata = {
  title: "月面探査機マップ",
  description: "月に着陸した探査機・着陸船の位置をインタラクティブな3Dマップで可視化",
  openGraph: {
    title: "月面探査機マップ",
    description: "人類が月に送り込んだ全探査機をインタラクティブな3D地球儀で探索",
    url: SITE_URL,
    siteName: "月面探査機マップ",
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "月面探査機マップ",
    description: "人類が月に送り込んだ全探査機をインタラクティブな3D地球儀で探索",
    images: [`${SITE_URL}/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  );
}

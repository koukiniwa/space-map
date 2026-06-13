import type { Metadata } from "next"

const SITE_URL = "https://space-map-koukiniwas-projects.vercel.app"

export const metadata: Metadata = {
  title: "火星探査機マップ",
  description: "火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化",
  openGraph: {
    title: "火星探査機マップ",
    description: "火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化",
    images: [{ url: `${SITE_URL}/og-mars.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "火星探査機マップ",
    images: [`${SITE_URL}/og-mars.png`],
  },
}

export default function MarsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

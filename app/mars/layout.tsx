import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "火星探査機マップ",
  description: "火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化",
}

export default function MarsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

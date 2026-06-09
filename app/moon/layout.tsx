import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "月面探査機マップ",
  description: "月に着陸した探査機・着陸船の位置をインタラクティブな3Dマップで可視化",
}

export default function MoonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

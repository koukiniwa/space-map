'use client'

import { useState, useEffect } from 'react'
import { LandingSite } from '@/data/lunar-sites'

interface InfoPanelProps {
  site:       LandingSite | null
  onClose:    () => void
  canPrev:    boolean
  canNext:    boolean
  onPrev:     () => void
  onNext:     () => void
}

const STATUS_LABEL: Record<LandingSite['status'], string> = {
  active:   '運用中',
  inactive: '運用終了',
  lost:     '消息不明',
}
const STATUS_COLOR: Record<LandingSite['status'], string> = {
  active:   'text-green-400 border-green-500/40 bg-green-500/10',
  inactive: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  lost:     'text-red-400   border-red-500/40   bg-red-500/10',
}
const STATUS_DOT: Record<LandingSite['status'], string> = {
  active:   'bg-green-400',
  inactive: 'bg-amber-400',
  lost:     'bg-red-400',
}

export default function InfoPanel({ site, onClose, canPrev, canNext, onPrev, onNext }: InfoPanelProps) {
  const [imgErr, setImgErr] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setImgErr(false) }, [site?.id])

  const handleCopyUrl = () => {
    if (!site) return
    const url = `${window.location.origin}/moon?site=${site.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <aside
      className={`
        fixed top-0 right-0 h-full w-[340px]
        bg-zinc-950 border-l border-zinc-800
        z-10 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${site ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {site && (
        <>
          {/* ── Photo header ───────────────────────── */}
          <div className="relative w-full aspect-[16/9] bg-zinc-900 flex-shrink-0 overflow-hidden">
            {site.photoUrl && !imgErr ? (
              <img
                key={site.id}
                src={site.photoUrl}
                alt={site.name}
                className="w-full h-full object-cover"
                onError={() => setImgErr(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-zinc-600">
                <span className="text-3xl">🌕</span>
                <span className="text-[10px] font-mono tracking-wider">NO IMAGE</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent" />
            {site.photoUrl && !imgErr && site.photoCredit && (
              <span className="absolute bottom-1 right-2 text-[10px] text-zinc-500 font-mono">
                © {site.photoCredit}
              </span>
            )}
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-lg"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          {/* ── Body ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4 font-mono flex flex-col gap-3">

            {/* Title + status */}
            <div>
              <h2 className="text-white text-xl font-bold tracking-wide mb-2">{site.name}</h2>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[site.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[site.status]}`} />
                {STATUS_LABEL[site.status]}
              </span>
            </div>

            {/* Data grid */}
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-zinc-600 text-xs self-center">国・機関</span>
              <span className="text-zinc-200">{site.country}</span>
              <span className="text-zinc-600 text-xs self-center">着陸日</span>
              <span className="text-zinc-200 tabular-nums">
                {site.landingDate
                  ? new Date(site.landingDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                  : `${site.year}年`}
              </span>
              <span className="text-zinc-600 text-xs self-center">座標</span>
              <span className="text-zinc-200 tabular-nums">
                {site.lat >= 0 ? `N${site.lat}°` : `S${Math.abs(site.lat)}°`}{' '}
                {site.lon >= 0 ? `E${site.lon}°` : `W${Math.abs(site.lon)}°`}
              </span>
            </div>

            <div className="border-t border-zinc-800" />

            {/* Description */}
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              {site.description}
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyUrl}
                className="w-full py-2 rounded text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copied ? '✓ URLをコピーしました' : 'URLをコピー'}
              </button>
              {site.articleUrl && (
                <a
                  href={site.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded text-sm text-center border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  関連記事を読む ↗
                </a>
              )}
            </div>
          </div>

          {/* ── Prev / Next navigation ──────────────── */}
          <div className="flex border-t border-zinc-800 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!canPrev}
              className="flex-1 py-2.5 text-xs text-zinc-500 hover:text-white hover:bg-zinc-900 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-r border-zinc-800"
            >
              ← 前のミッション
            </button>
            <button
              onClick={onNext}
              disabled={!canNext}
              className="flex-1 py-2.5 text-xs text-zinc-500 hover:text-white hover:bg-zinc-900 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              次のミッション →
            </button>
          </div>
        </>
      )}
    </aside>
  )
}

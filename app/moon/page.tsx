'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { landingSites, LandingSite } from '@/data/lunar-sites'
import InfoPanel from '@/components/InfoPanel'
import MissionList from '@/components/MissionList'

const MoonGlobe = dynamic(() => import('@/components/MoonGlobe'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4 font-mono text-zinc-400">
        <div className="w-10 h-10 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
        <span className="text-sm">月面マップを読み込み中...</span>
      </div>
    </div>
  ),
})

const STATUS_CSS: Record<LandingSite['status'], string> = {
  active:   'bg-green-500',
  inactive: 'bg-amber-400',
  lost:     'bg-red-500',
}
const STATUS_LABEL: Record<LandingSite['status'], string> = {
  active:   '運用中',
  inactive: '運用終了',
  lost:     '消息不明',
}

export default function MoonPage() {
  const [selectedSite,  setSelectedSite]  = useState<LandingSite | null>(null)
  const [era,    setEra]    = useState('all')
  const [result, setResult] = useState('all') // 'all' | 'success' | 'failure'

  // ── Filtered sites ──────────────────────────────────────
  const ERA_RANGE: Record<string, [number, number]> = {
    all:     [1966, 2030],
    coldwar: [1966, 1976],
    modern:  [2013, 2030],
  }
  const [yearMin, yearMax] = ERA_RANGE[era] ?? [1966, 2030]
  const filteredSites = landingSites
    .filter(s => s.year >= yearMin && s.year <= yearMax)
    .filter(s => {
      if (result === 'success') return s.status !== 'lost'
      if (result === 'failure') return s.status === 'lost'
      return true
    })
    .sort((a, b) => {
      const da = a.landingDate ?? `${a.year}-01-01`
      const db = b.landingDate ?? `${b.year}-01-01`
      return da < db ? -1 : da > db ? 1 : 0
    })

  // フィルター変更で選択中サイトが非表示になったら閉じる
  useEffect(() => {
    if (selectedSite && !filteredSites.find(s => s.id === selectedSite.id)) {
      handleSelectSite(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSites])

  // ── URL state: read on mount ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('site')
    if (id) {
      const site = landingSites.find(s => s.id === id)
      if (site) setSelectedSite(site)
    }
  }, [])

  // ── Handlers ────────────────────────────────────────────
  const handleSelectSite = (site: LandingSite | null) => {
    setSelectedSite(site)
    const url = site ? `/moon?site=${site.id}` : '/moon'
    window.history.replaceState({}, '', url)
  }

  // ── ESC key to close InfoPanel ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSelectSite(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Prev / Next navigation ──────────────────────────────
  const selectedIdx = selectedSite
    ? filteredSites.findIndex(s => s.id === selectedSite.id)
    : -1
  const handlePrev = () => {
    if (selectedIdx > 0) handleSelectSite(filteredSites[selectedIdx - 1])
  }
  const handleNext = () => {
    if (selectedIdx >= 0 && selectedIdx < filteredSites.length - 1)
      handleSelectSite(filteredSites[selectedIdx + 1])
  }

  // ── Stats ───────────────────────────────────────────────
  const activeCount   = filteredSites.filter(s => s.status === 'active').length
  const lostCount     = filteredSites.filter(s => s.status === 'lost').length
  const countryCount  = new Set(filteredSites.map(s => s.country)).size
  const yearSpan      = filteredSites.length > 0
    ? `${Math.min(...filteredSites.map(s => s.year))}〜${Math.max(...filteredSites.map(s => s.year))}`
    : '—'

  // ── Globe view ──────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden font-mono">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800 flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <h1 className="text-white text-base font-bold tracking-widest whitespace-nowrap">
            月面探査機マップ
          </h1>
          <a
            href="https://www.uchu-bin.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
          >
            宇宙便 ↗
          </a>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-500 flex-1 justify-center">
          <span className="tabular-nums">
            <span className="text-zinc-300 font-bold">{filteredSites.length}</span> ミッション
          </span>
          <span className="text-zinc-700">|</span>
          <span className="tabular-nums">
            <span className="text-zinc-300 font-bold">{countryCount}</span> カ国・機関
          </span>
          <span className="text-zinc-700">|</span>
          <span className="tabular-nums text-zinc-500">{yearSpan}</span>
          {activeCount > 0 && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                <span className="text-green-400">{activeCount} 運用中</span>
              </span>
            </>
          )}
          {lostCount > 0 && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                <span className="text-red-400">{lostCount} 失敗</span>
              </span>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs text-zinc-500 flex-shrink-0">
          {(['active', 'inactive', 'lost'] as const).map(s => (
            <span key={s} className="flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_CSS[s]}`} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left sidebar */}
        <MissionList
          allSites={landingSites}
          filteredSites={filteredSites}
          selectedSite={selectedSite}
          onSelect={handleSelectSite}
          era={era}
          onEra={setEra}
          result={result}
          onResult={setResult}
        />

        {/* Globe */}
        <MoonGlobe
          sites={filteredSites}
          onSelectSite={handleSelectSite}
          paused={selectedSite !== null}
          activeSite={selectedSite}
        />

        {/* Right info panel */}
        <InfoPanel
          site={selectedSite}
          onClose={() => handleSelectSite(null)}
          canPrev={selectedIdx > 0}
          canNext={selectedIdx >= 0 && selectedIdx < filteredSites.length - 1}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      {/* ── Footer ── */}
      <footer className="px-6 py-1.5 border-t border-zinc-800 text-zinc-700 text-xs text-center flex-shrink-0">
        ドラッグで回転 · スクロール / ± でズーム · マーカーまたはリストをクリックで詳細 · ESC で閉じる
      </footer>
    </div>
  )
}

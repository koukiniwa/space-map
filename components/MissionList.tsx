'use client'

import { useState } from 'react'
import { LandingSite } from '@/data/lunar-sites'

interface MissionListProps {
  allSites:      LandingSite[]
  filteredSites: LandingSite[]
  selectedSite:  LandingSite | null
  onSelect:      (site: LandingSite) => void
  era:           string
  onEra:         (era: string) => void
  result:        string
  onResult:      (r: string) => void
}

const FLAG: Record<string, string> = {
  'アメリカ':        '🇺🇸',
  'アメリカ（民間）': '🇺🇸',
  'ソビエト連邦':    '🇷🇺',
  'ロシア':         '🇷🇺',
  '中国':           '🇨🇳',
  'インド':         '🇮🇳',
  '日本':           '🇯🇵',
  'イスラエル':     '🇮🇱',
}

const STATUS_DOT: Record<LandingSite['status'], string> = {
  active:   'bg-green-400',
  inactive: 'bg-amber-400',
  lost:     'bg-red-400',
}
const STATUS_LABEL: Record<LandingSite['status'], string> = {
  active:   '運用中',
  inactive: '運用終了',
  lost:     '消息不明',
}

const ERA_OPTIONS = [
  { key: 'all',     label: '全て',   sub: '' },
  { key: 'coldwar', label: '冷戦期', sub: '1966–76' },
  { key: 'modern',  label: '現代',   sub: '2013–' },
]

// Country display order (chronological by first landing)
const COUNTRY_ORDER = [
  'ソビエト連邦',
  'ロシア',
  'アメリカ',
  'アメリカ（民間）',
  '中国',
  'インド',
  '日本',
  'イスラエル',
]

const RESULT_OPTIONS = [
  { key: 'all',     label: '全て' },
  { key: 'success', label: '成功', dot: 'bg-amber-400' },
  { key: 'failure', label: '失敗', dot: 'bg-red-500' },
]

export default function MissionList({
  allSites, filteredSites, selectedSite, onSelect, era, onEra, result, onResult,
}: MissionListProps) {
  const successCount = allSites.filter(s => s.status !== 'lost').length
  const failureCount = allSites.filter(s => s.status === 'lost').length
  const [collapsed, setCollapsed]       = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (country: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(country)) next.delete(country)
      else next.add(country)
      return next
    })
  }

  // Group filtered sites by country, preserving COUNTRY_ORDER
  const groups = COUNTRY_ORDER
    .map(country => ({
      country,
      sites: filteredSites
        .filter(s => s.country === country)
        .sort((a, b) => b.year - a.year),
    }))
    .filter(g => g.sites.length > 0)

  const totalFiltered = filteredSites.length

  return (
    <div className={`flex-shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-800 font-mono transition-all duration-200 ${collapsed ? 'w-10' : 'w-64'}`}>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center justify-center h-8 border-b border-zinc-800 text-zinc-500 hover:text-white text-xs flex-shrink-0"
        title={collapsed ? 'リストを開く' : 'リストを閉じる'}
      >
        {collapsed ? '▶' : '◀  ミッション一覧'}
      </button>

      {!collapsed && (
        <>
          {/* ── Filters ───────────────────────────────── */}
          <div className="px-3 pt-2.5 pb-2 border-b border-zinc-800 flex-shrink-0 flex flex-col gap-2">
            {/* Era */}
            <div>
              <div className="text-[10px] text-zinc-600 mb-1 tracking-wider">時代</div>
              <div className="flex gap-1">
                {ERA_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => onEra(opt.key)}
                    className={`flex-1 py-1 rounded text-[11px] font-bold leading-tight transition-colors
                      ${era === opt.key ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'}`}
                  >
                    <div>{opt.label}</div>
                    {opt.sub && <div className="text-[9px] opacity-60 font-normal">{opt.sub}</div>}
                  </button>
                ))}
              </div>
            </div>
            {/* Result */}
            <div>
              <div className="text-[10px] text-zinc-600 mb-1 tracking-wider">結果</div>
              <div className="flex gap-1">
                {RESULT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => onResult(opt.key)}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1
                      ${result === opt.key ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'}`}
                  >
                    {opt.dot && <span className={`w-1.5 h-1.5 rounded-full ${opt.dot} flex-shrink-0`} />}
                    <span>{opt.label}</span>
                    {opt.key === 'success' && <span className="text-[9px] opacity-60">({successCount})</span>}
                    {opt.key === 'failure' && <span className="text-[9px] opacity-60">({failureCount})</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-zinc-700">{totalFiltered} ミッション表示中</div>
          </div>

          {/* ── Country-grouped list ──────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="text-zinc-600 text-xs text-center py-8">該当なし</div>
            ) : (
              groups.map(({ country, sites }) => {
                const isGroupCollapsed = collapsedGroups.has(country)
                const flag = FLAG[country] ?? '🌐'
                const activeCount = sites.filter(s => s.status === 'active').length

                return (
                  <div key={country}>
                    {/* Country header */}
                    <button
                      onClick={() => toggleGroup(country)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border-b border-zinc-800 transition-colors"
                    >
                      <span className="text-base leading-none">{flag}</span>
                      <span className="flex-1 text-left">
                        <span className="text-zinc-300 text-xs font-bold">{country}</span>
                        <span className="text-zinc-600 text-[10px] ml-1.5">{sites.length}件</span>
                        {activeCount > 0 && (
                          <span className="text-green-400 text-[10px] ml-1">● 運用中</span>
                        )}
                      </span>
                      <span className="text-zinc-600 text-[10px]">
                        {isGroupCollapsed ? '▶' : '▼'}
                      </span>
                    </button>

                    {/* Mission items */}
                    {!isGroupCollapsed && sites.map(site => {
                      const isSelected = selectedSite?.id === site.id
                      return (
                        <button
                          key={site.id}
                          onClick={() => onSelect(site)}
                          className={`
                            w-full text-left pl-8 pr-3 py-2 border-b border-zinc-900
                            flex items-center gap-2 transition-colors
                            ${isSelected
                              ? 'bg-zinc-800 text-white'
                              : 'hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'}
                          `}
                          title={STATUS_LABEL[site.status]}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[site.status]}`} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-bold truncate leading-tight">
                              {site.name}
                            </span>
                            <span className="block text-[10px] text-zinc-600 leading-tight">
                              {site.year}年
                            </span>
                          </span>
                          {isSelected && <span className="text-zinc-400 text-xs">›</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

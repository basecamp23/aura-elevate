'use client'
import { useState, useMemo } from 'react'
import { useLeads } from '@/components/LeadsProvider'
import { SRC_COLORS, SRC_NAMES, pct, fmtDate } from '@/lib/utils'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function SourcesPage() {
  const { filtered, loading, period, setPeriod } = useLeads()
  const [openDrills, setOpenDrills] = useState<Record<string, boolean>>({})
  const [activeSource, setActiveSource] = useState<string | null>(null)

  const srcMap = useMemo(() => {
    const m: Record<string, { count: number; content: Record<string, number>; campaign: Record<string, number>; medium: Record<string, number> }> = {}
    filtered.forEach(l => {
      if (!m[l.source]) m[l.source] = { count: 0, content: {}, campaign: {}, medium: {} }
      m[l.source].count++
      if (l.content) m[l.source].content[l.content] = (m[l.source].content[l.content] || 0) + 1
      if (l.campaign) m[l.source].campaign[l.campaign] = (m[l.source].campaign[l.campaign] || 0) + 1
      if (l.medium) m[l.source].medium[l.medium] = (m[l.source].medium[l.medium] || 0) + 1
    })
    return m
  }, [filtered])

  const sorted = useMemo(() =>
    Object.entries(srcMap).sort((a, b) => b[1].count - a[1].count),
    [srcMap]
  )

  const campMap = useMemo(() => {
    const m: Record<string, number> = {}
    filtered.forEach(l => { if (l.campaign) m[l.campaign] = (m[l.campaign] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [filtered])

  const contentMap = useMemo(() => {
    const m: Record<string, number> = {}
    filtered.forEach(l => { if (l.content) m[l.content] = (m[l.content] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [filtered])

  const sourceLeads = useMemo(() =>
    activeSource ? filtered.filter(l => l.source === activeSource).slice(0, 50) : [],
    [filtered, activeSource]
  )

  const maxCount = sorted[0]?.[1].count || 1
  const total = filtered.length || 1

  if (loading) return <div className="loading-center"><span className="spinner" /> Loading…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Source Attribution</div>
          <div className="page-sub">First-touch UTM from Supabase booking form · locked attribution</div>
        </div>
        <div className="filter-bar" style={{ margin: 0 }}>
          {(['all', '30d', '90d'] as const).map(p => (
            <button key={p} className={`filter-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Source overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>Leads by source</div>
          <div className="card-sub" style={{ marginBottom: 14 }}>click to drill down · select a source to see leads</div>
          {sorted.map(([src, d], i) => {
            const color = SRC_COLORS[src] || '#888'
            const isOpen = openDrills[src]
            const campEntries = Object.entries(d.campaign).sort((a, b) => b[1] - a[1]).slice(0, 6)
            const contentEntries = Object.entries(d.content).sort((a, b) => b[1] - a[1]).slice(0, 6)
            return (
              <div key={src}>
                <div
                  className="src-row"
                  style={{ padding: '9px 6px' }}
                  onClick={() => {
                    setOpenDrills(p => ({ ...p, [src]: !p[src] }))
                    setActiveSource(src === activeSource ? null : src)
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                    {SRC_NAMES[src] || src}
                    <span style={{ fontSize: 9, color: 'var(--text3)', display: 'inline-block', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'none', marginLeft: 4 }}>▶</span>
                  </div>
                  <div className="src-bar-wrap">
                    <div className="src-bar" style={{ width: `${Math.round(d.count / maxCount * 100)}%`, background: color }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, minWidth: 40, textAlign: 'right' }}>{d.count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 36, textAlign: 'right' }}>{Math.round(d.count / total * 100)}%</div>
                </div>
                {isOpen && (
                  <div className="drill open">
                    {campEntries.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, marginBottom: 4, paddingLeft: 2 }}>Campaigns</div>
                        {campEntries.map(([c, n]) => (
                          <div key={c} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px', gap: 8, padding: '4px 2px', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
                            <div style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>{c.replace('AA | ', '').replace(' | SoCal', '')}</div>
                            <div style={{ textAlign: 'right', fontWeight: 500 }}>{n}</div>
                            <div style={{ textAlign: 'right', color: 'var(--text3)' }}>{Math.round(n / d.count * 100)}%</div>
                          </div>
                        ))}
                      </>
                    )}
                    {contentEntries.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, margin: '8px 0 4px 2px' }}>Content</div>
                        {contentEntries.map(([c, n]) => (
                          <div key={c} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px', gap: 8, padding: '4px 2px', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
                            <div style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>{c}</div>
                            <div style={{ textAlign: 'right', fontWeight: 500 }}>{n}</div>
                            <div style={{ textAlign: 'right', color: 'var(--text3)' }}>{Math.round(n / d.count * 100)}%</div>
                          </div>
                        ))}
                      </>
                    )}
                    {campEntries.length === 0 && contentEntries.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 2px' }}>No UTM content data for this source</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Source leads panel */}
        <div className="card">
          {activeSource ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: SRC_COLORS[activeSource] || '#888' }} />
                <div className="card-title">{SRC_NAMES[activeSource] || activeSource}</div>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{srcMap[activeSource]?.count} leads</span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setActiveSource(null); setOpenDrills({}) }}>✕</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Stage</th>
                      <th>Content</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceLeads.map(l => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{l.first} {l.last}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l.email}</div>
                        </td>
                        <td>
                          {l.ghl_stage
                            ? <span className={`badge badge-${l.ghl_stage}`}>{l.ghl_stage}</span>
                            : <span className="badge badge-none">—</span>
                          }
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--text3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.content || l.campaign}>
                          {l.content || l.campaign || '—'}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(l.created)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sourceLeads.length === 50 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Showing first 50 — use All Leads for full list</div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: 'var(--text3)', fontSize: 13 }}>
              <div style={{ marginBottom: 8, fontSize: 24 }}>←</div>
              Click a source to see leads
            </div>
          )}
        </div>
      </div>

      {/* Campaign + Content charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Top campaigns</div>
          <div className="card-sub" style={{ marginBottom: 12 }}>by lead volume</div>
          <div style={{ position: 'relative', width: '100%', height: campMap.length * 36 + 40 }}>
            <Bar
              data={{
                labels: campMap.map(([c]) => c.replace('AA | ', '').replace(' | SoCal', '').slice(0, 35)),
                datasets: [{ data: campMap.map(([, n]) => n), backgroundColor: '#378ADD99', borderRadius: 3 }]
              }}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.parsed.x + ' leads' } } },
                scales: {
                  x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
                  y: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top content / ad names</div>
          <div className="card-sub" style={{ marginBottom: 12 }}>UTM content from booking form</div>
          <div style={{ position: 'relative', width: '100%', height: contentMap.length * 36 + 40 }}>
            <Bar
              data={{
                labels: contentMap.map(([c]) => c.slice(0, 35)),
                datasets: [{ data: contentMap.map(([, n]) => n), backgroundColor: '#D4537E99', borderRadius: 3 }]
              }}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.parsed.x + ' leads' } } },
                scales: {
                  x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
                  y: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

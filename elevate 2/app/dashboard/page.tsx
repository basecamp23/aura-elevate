'use client'
import { useLeads } from '@/components/LeadsProvider'
import { SRC_COLORS, SRC_NAMES, STAGE_META, shortProc, pct, fmtDate } from '@/lib/utils'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { useState } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function DashboardPage() {
  const { filtered, loading, period, setPeriod, reload, connStatus } = useLeads()
  const [openDrills, setOpenDrills] = useState<Record<string, boolean>>({})

  const leads = filtered
  const consult = leads.filter(l => l.ghl_stage === 'consult').length
  const booked  = leads.filter(l => l.ghl_stage === 'booked').length
  const utmHit  = leads.filter(l => l.utm_source_raw).length
  const synced  = leads.filter(l => l.ghl_stage).length

  // Source map
  const srcMap: Record<string, number> = {}
  const contentMap: Record<string, Record<string, number>> = {}
  leads.forEach(l => {
    srcMap[l.source] = (srcMap[l.source] || 0) + 1
    const ck = l.content || l.campaign
    if (ck) {
      if (!contentMap[l.source]) contentMap[l.source] = {}
      contentMap[l.source][ck] = (contentMap[l.source][ck] || 0) + 1
    }
  })
  const sortedSrc = Object.entries(srcMap).sort((a, b) => b[1] - a[1])
  const maxSrc = sortedSrc[0]?.[1] || 1

  const chartData = {
    labels: sortedSrc.map(([s]) => SRC_NAMES[s] || s),
    datasets: [{
      data: sortedSrc.map(([, n]) => n),
      backgroundColor: sortedSrc.map(([s]) => (SRC_COLORS[s] || '#888') + 'cc'),
      borderRadius: 4,
    }]
  }

  const recent = leads.slice(0, 15)

  if (loading) return <div className="loading-center"><span className="spinner" /> Loading leads…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">
            {leads.length.toLocaleString()} leads · Supabase {connStatus === 'live' ? 'live' : 'connecting'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="filter-bar" style={{ margin: 0 }}>
            {(['all', '30d', '90d'] as const).map(p => (
              <button key={p} className={`filter-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
                {p === 'all' ? 'All time' : p}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => reload()}>↺ Refresh</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Leads</div>
          <div className="metric-value">{leads.length.toLocaleString()}</div>
          <div className="metric-sub">from booking form</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Consultations</div>
          <div className="metric-value">{consult}</div>
          <div className="metric-sub up">{pct(consult, leads.length)} of leads</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Surgery Booked</div>
          <div className="metric-value">{booked}</div>
          <div className="metric-sub up">{pct(booked, leads.length)} of leads</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">UTM Coverage</div>
          <div className="metric-value">{pct(utmHit, leads.length)}</div>
          <div className="metric-sub">{utmHit} attributed leads</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">GHL Synced</div>
          <div className="metric-value">{synced}</div>
          <div className="metric-sub">{synced ? pct(synced, leads.length) + ' matched' : 'Upload GHL CSV'}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Leads by source</div>
          <div className="card-sub">click to drill into content</div>
          <div style={{ marginTop: 14 }}>
            {sortedSrc.map(([src, cnt], i) => {
              const color = SRC_COLORS[src] || '#888'
              const entries = Object.entries(contentMap[src] || {}).sort((a, b) => b[1] - a[1]).slice(0, 6)
              const drillKey = `d${i}`
              const isOpen = openDrills[drillKey]
              return (
                <div key={src}>
                  <div className="src-row" onClick={() => entries.length && setOpenDrills(p => ({ ...p, [drillKey]: !p[drillKey] }))}>
                    <div className="src-dot" style={{ width: 8, height: 8, background: color }} />
                    <div style={{ flex: 1, fontSize: 13 }}>
                      {SRC_NAMES[src] || src}
                      {entries.length > 0 && <span className={`chev${isOpen ? ' open' : ''}`}>&#9654;</span>}
                    </div>
                    <div className="src-bar-wrap">
                      <div className="src-bar" style={{ width: `${Math.round(cnt / maxSrc * 100)}%`, background: color }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, minWidth: 36, textAlign: 'right' }}>{cnt}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 32, textAlign: 'right' }}>{Math.round(cnt / leads.length * 100)}%</div>
                  </div>
                  {isOpen && entries.length > 0 && (
                    <div className="drill open">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px', gap: 8, fontSize: 10, color: 'var(--text3)', paddingBottom: 4, borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
                        <span>Content / Campaign</span><span style={{ textAlign: 'right' }}>Leads</span><span style={{ textAlign: 'right' }}>%</span>
                      </div>
                      {entries.map(([c, n]) => (
                        <div key={c} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
                          <div style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>{c.length > 42 ? c.slice(0, 42) + '…' : c}</div>
                          <div style={{ textAlign: 'right', fontWeight: 500 }}>{n}</div>
                          <div style={{ textAlign: 'right', color: 'var(--text3)' }}>{Math.round(n / cnt * 100)}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Source breakdown</div>
          <div className="card-sub">{leads.length} leads total</div>
          <div className="chart-wrap">
            <Bar data={chartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.parsed.y + ' leads' } } },
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, stepSize: 1 } }
              }
            }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div><div className="card-title">Recent leads</div><div className="card-sub">Supabase leads · GHL status where synced</div></div>
          <a href="/leads" className="btn btn-sm">View all</a>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Source</th><th>Procedure</th><th>GHL Status</th><th>Date</th></tr></thead>
            <tbody>
              {recent.map(l => (
                <tr key={l.id}>
                  <td><div style={{ fontWeight: 500 }}>{l.first} {l.last}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.email}</div></td>
                  <td><div className="src-inline"><span className="src-inline-dot" style={{ background: SRC_COLORS[l.source] || '#888' }} />{SRC_NAMES[l.source] || l.source}</div></td>
                  <td><span className="proc-tag" title={l.procedure}>{shortProc(l.procedure) || '—'}</span></td>
                  <td><StageBadge stage={l.ghl_stage} raw={l.ghl_status} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(l.created)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StageBadge({ stage, raw }: { stage: string | null; raw: string | null }) {
  const meta = stage ? STAGE_META[stage] : null
  if (!meta) return <span className="badge badge-none" title={raw || ''}>—</span>
  return <span className={`badge badge-${stage}`} title={raw || ''}>{meta.label}</span>
}

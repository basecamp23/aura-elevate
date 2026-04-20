'use client'
import { useState, useMemo } from 'react'
import { useLeads } from '@/components/LeadsProvider'
import { SRC_COLORS, SRC_NAMES, STAGE_META, shortProc, fmtDate, pct } from '@/lib/utils'

const STAGE_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'new',     label: 'New' },
  { key: 'contact', label: 'Contacted' },
  { key: 'consult', label: 'Consultation' },
  { key: 'booked',  label: 'Surgery Booked' },
  { key: 'noshow',  label: 'No Show' },
  { key: 'lost',    label: 'Lost' },
]

export default function LeadsPage() {
  const { filtered, loading, period, setPeriod } = useLeads()
  const [stageTab, setStageTab] = useState('all')
  const [srcFilter, setSrcFilter] = useState('')
  const [procFilter, setProcFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')

  const procs = useMemo(() => {
    const s = new Set(filtered.map(l => l.procedure).filter(Boolean))
    return [...s].sort()
  }, [filtered])

  const rows = useMemo(() => {
    let r = filtered
    if (stageTab !== 'all') {
      if (stageTab === 'new') r = r.filter(l => !l.ghl_stage || l.ghl_stage === 'new')
      else r = r.filter(l => l.ghl_stage === stageTab)
    }
    if (srcFilter) r = r.filter(l => l.source === srcFilter)
    if (procFilter) r = r.filter(l => l.procedure === procFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(l =>
        (l.first + ' ' + l.last).toLowerCase().includes(q) ||
        l.email.includes(q) ||
        l.phone.includes(q)
      )
    }
    if (sortBy === 'date-desc') r = [...r].sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())
    else if (sortBy === 'date-asc') r = [...r].sort((a, b) => new Date(a.created || 0).getTime() - new Date(b.created || 0).getTime())
    else if (sortBy === 'name') r = [...r].sort((a, b) => a.first.localeCompare(b.first))
    return r
  }, [filtered, stageTab, srcFilter, procFilter, search, sortBy])

  const stageCounts = useMemo(() => {
    const m: Record<string, number> = { all: filtered.length }
    filtered.forEach(l => {
      const s = l.ghl_stage || 'new'
      m[s] = (m[s] || 0) + 1
    })
    m.new = filtered.filter(l => !l.ghl_stage || l.ghl_stage === 'new').length
    return m
  }, [filtered])

  if (loading) return <div className="loading-center"><span className="spinner" /> Loading leads…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">All Leads</div>
          <div className="page-sub">{filtered.length.toLocaleString()} leads · Supabase live · GHL status overlaid</div>
        </div>
        <div className="filter-bar" style={{ margin: 0 }}>
          {(['all', '30d', '90d'] as const).map(p => (
            <button key={p} className={`filter-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Stage tab row */}
      <div className="tab-row" style={{ marginBottom: 16 }}>
        {STAGE_TABS.map(t => (
          <div
            key={t.key}
            className={`tab${stageTab === t.key ? ' active' : ''}`}
            onClick={() => setStageTab(t.key)}
          >
            {t.label}
            <span className="count-chip">{stageCounts[t.key] || 0}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="fsel" value={srcFilter} onChange={e => setSrcFilter(e.target.value)}>
          <option value="">All sources</option>
          {Object.entries(SRC_NAMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="fsel" value={procFilter} onChange={e => setProcFilter(e.target.value)}>
          <option value="">All procedures</option>
          {procs.map(p => <option key={p} value={p}>{shortProc(p)}</option>)}
        </select>
        <select className="fsel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="name">Name A–Z</option>
        </select>
        <div className="divider" />
        <input
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
        />
        {(srcFilter || procFilter || search || stageTab !== 'all') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSrcFilter(''); setProcFilter(''); setSearch(''); setStageTab('all') }}>
            Clear filters
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 180 }}>Name</th>
                <th style={{ width: 80 }}>Source</th>
                <th style={{ width: 150 }}>Procedure</th>
                <th style={{ width: 110 }}>GHL Status</th>
                <th style={{ width: 130 }}>Disposition (SB)</th>
                <th style={{ width: 150 }}>Campaign</th>
                <th style={{ width: 90 }}>Date</th>
                <th style={{ width: 60 }}>Age</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 300).map(l => {
                const stage = l.ghl_stage
                const meta = stage ? STAGE_META[stage] : null
                return (
                  <tr key={`${l.id}-${l.email}`}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.first} {l.last}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: SRC_COLORS[l.source] || '#888', flexShrink: 0 }} />
                        {SRC_NAMES[l.source] || l.source}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text2)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 145 }} title={l.procedure}>
                        {shortProc(l.procedure) || '—'}
                      </span>
                    </td>
                    <td>
                      {meta ? (
                        <span className={`badge badge-${stage}`} title={l.ghl_status || ''}>
                          {meta.label}
                        </span>
                      ) : (
                        <span className="badge badge-none">—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text3)' }}>{l.disposition || '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text3)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 145 }} title={l.campaign}>
                        {l.campaign ? l.campaign.replace('AA | ', '').replace(' | SoCal', '') : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(l.created)}</td>
                    <td style={{ fontSize: 11, color: 'var(--text3)' }}>{l.age_range || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
          {rows.length} leads{rows.length > 300 ? ' (showing first 300)' : ''}
          {rows.length !== filtered.length && ` · ${filtered.length} total`}
        </div>
      </div>
    </div>
  )
}

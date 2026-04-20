'use client'
import { useRef, useState } from 'react'
import { useLeads } from '@/components/LeadsProvider'
import { SRC_COLORS, SRC_NAMES, STAGE_META, mapGHLStage, normEmail, shortProc, fmtDate } from '@/lib/utils'
import Papa from 'papaparse'

interface SyncResult {
  email: string
  name: string
  syncStatus: 'matched' | 'sb_only' | 'ghl_only'
  ghl_stage: string | null
  ghl_status: string
  source: string
  procedure: string
  created: string | null
}

export default function GHLPage() {
  const { leads, setGHLMap, filtered } = useLeads()
  const [results, setResults] = useState<SyncResult[]>([])
  const [syncTab, setSyncTab] = useState<'all' | 'matched' | 'sb_only' | 'ghl_only'>('all')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState<'ok' | 'err' | ''>('')
  const [progress, setProgress] = useState(0)
  const [synced, setSynced] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [ghlFile, setGhlFile] = useState<File | null>(null)

  function handleFile(file: File) {
    setGhlFile(file)
    setFileName(file.name)
    setStatus(file.name + ' ready — click Sync')
    setStatusType('')
  }

  function runSync() {
    if (!ghlFile) return
    setStatus('Parsing GHL export…')
    setProgress(20)
    const reader = new FileReader()
    reader.onload = e => {
      setProgress(50)
      const parsed = Papa.parse(e.target?.result as string, { header: true, skipEmptyLines: true })
      const ghlRows: any[] = parsed.data

      // Build GHL map
      const newGHLMap: Record<string, { status: string; tags: string; last_activity: string }> = {}
      ghlRows.forEach((row: any) => {
        const email = normEmail(row['Email'] || row['email'] || '')
        if (email) {
          newGHLMap[email] = {
            status: row['Status'] || row['stage'] || '',
            tags: row['Tags'] || row['tags'] || '',
            last_activity: row['Last Activity'] || row['Updated on'] || '',
          }
        }
      })
      setGHLMap(newGHLMap)
      setProgress(80)

      // Build sync results
      const sbEmails = new Set(leads.map(l => l.email).filter(Boolean))
      const syncOut: SyncResult[] = []

      leads.forEach(l => {
        const ghl = newGHLMap[l.email]
        syncOut.push({
          email: l.email,
          name: `${l.first} ${l.last}`.trim(),
          syncStatus: ghl ? 'matched' : 'sb_only',
          ghl_stage: ghl ? mapGHLStage(ghl.status, ghl.tags) : null,
          ghl_status: ghl?.status || '',
          source: l.source,
          procedure: l.procedure,
          created: l.created,
        })
      })

      ghlRows.forEach((row: any) => {
        const email = normEmail(row['Email'] || row['email'] || '')
        if (email && !sbEmails.has(email)) {
          const status = row['Status'] || row['stage'] || ''
          const tags = row['Tags'] || row['tags'] || ''
          syncOut.push({
            email,
            name: row['Contact Name'] || `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
            syncStatus: 'ghl_only',
            ghl_stage: mapGHLStage(status, tags),
            ghl_status: status,
            source: 'other',
            procedure: '',
            created: null,
          })
        }
      })

      setProgress(100)
      setResults(syncOut)
      setSynced(true)
      const matched = syncOut.filter(r => r.syncStatus === 'matched').length
      const sbOnly = syncOut.filter(r => r.syncStatus === 'sb_only').length
      const ghlOnly = syncOut.filter(r => r.syncStatus === 'ghl_only').length
      setStatus(`Synced — ${matched} matched · ${sbOnly} SB only · ${ghlOnly} GHL only`)
      setStatusType('ok')
      setTimeout(() => setProgress(0), 800)
    }
    reader.readAsText(ghlFile)
  }

  function clearSync() {
    setGhlFile(null)
    setFileName('')
    setStatus('')
    setStatusType('')
    setProgress(0)
    setResults([])
    setSynced(false)
    setSyncTab('all')
    setGHLMap({})
    if (fileRef.current) fileRef.current.value = ''
  }

  function exportCSV() {
    const headers = ['name', 'email', 'sync_status', 'ghl_stage', 'ghl_status_raw', 'source', 'procedure', 'sb_date']
    const rows = visibleResults.map(r => [
      r.name, r.email, r.syncStatus, r.ghl_stage || '', r.ghl_status,
      SRC_NAMES[r.source] || r.source, shortProc(r.procedure), fmtDate(r.created)
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `ghl_sync_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const counts = {
    all: results.length,
    matched: results.filter(r => r.syncStatus === 'matched').length,
    sb_only: results.filter(r => r.syncStatus === 'sb_only').length,
    ghl_only: results.filter(r => r.syncStatus === 'ghl_only').length,
  }

  const visibleResults = syncTab === 'all' ? results : results.filter(r => r.syncStatus === syncTab)

  const syncPill = (s: string) => {
    const map: Record<string, [string, string]> = {
      matched: ['#EAF3DE', '#3B6D11'],
      sb_only: ['#E6F1FB', '#185FA5'],
      ghl_only: ['#FAEEDA', '#854F0B'],
    }
    const labels: Record<string, string> = { matched: 'matched', sb_only: 'SB only', ghl_only: 'GHL only' }
    const [bg, color] = map[s] || ['#f0efe9', '#888']
    return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: bg, color }}>{labels[s] || s}</span>
  }

  // Stats from current filtered leads
  const stageBreakdown = filtered.reduce((acc, l) => {
    const k = l.ghl_stage || 'unsynced'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">GHL Sync</div>
          <div className="page-sub">Upload GHL contacts or opportunities export · matches on email · updates pipeline stage</div>
        </div>
      </div>

      {/* Current stage breakdown */}
      {synced && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { key: 'booked',  label: 'Surgery Booked' },
            { key: 'consult', label: 'Consultation' },
            { key: 'contact', label: 'Contacted' },
            { key: 'new',     label: 'New Lead' },
            { key: 'noshow',  label: 'No Show' },
            { key: 'lost',    label: 'Lost' },
          ].map(({ key, label }) => (
            <div key={key} className="metric-card" style={{ padding: '10px 12px' }}>
              <div className="metric-label" style={{ fontSize: 9 }}>{label}</div>
              <div className="metric-value" style={{ fontSize: 18 }}>{stageBreakdown[key] || 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload panel */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="card-title">GHL export</div>
            <div className="card-sub">Contacts export or Opportunities export — both work · matched on email</div>
          </div>
          {synced && <span style={{ fontSize: 11, color: '#1a7a4a' }}>✓ {counts.matched} leads synced</span>}
        </div>

        <div
          ref={dropRef}
          className={`drop-zone${dragging ? ' drag' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false)
            const f = e.dataTransfer.files[0]
            if (f?.name.endsWith('.csv')) handleFile(f)
          }}
        >
          {fileName || 'Drop GHL export CSV here or click to browse'}
        </div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        <div style={{ height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${progress}%`, transition: 'width .3s' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <button
            className="btn btn-primary"
            onClick={runSync}
            disabled={!ghlFile}
          >
            Sync statuses
          </button>
          {synced && <button className="btn" onClick={clearSync}>Clear</button>}
          <span className={statusType === 'ok' ? 'status-ok' : statusType === 'err' ? 'status-err' : ''} style={{ fontSize: 12, color: 'var(--text3)' }}>
            {status}
          </span>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="card-title">Sync results</div>
              <div className="card-sub">{counts.matched} matched · {counts.sb_only} SB only · {counts.ghl_only} GHL only</div>
            </div>
            <button className="btn btn-sm" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="tab-row">
            {([
              { key: 'all',      label: 'All' },
              { key: 'matched',  label: 'Matched' },
              { key: 'sb_only',  label: 'SB only' },
              { key: 'ghl_only', label: 'GHL only' },
            ] as const).map(t => (
              <div
                key={t.key}
                className={`tab${syncTab === t.key ? ' active' : ''}`}
                onClick={() => setSyncTab(t.key)}
              >
                {t.label} <span className="count-chip">{counts[t.key]}</span>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Name</th>
                  <th style={{ width: 90 }}>Sync</th>
                  <th style={{ width: 110 }}>GHL Stage</th>
                  <th style={{ width: 130 }}>GHL Status (raw)</th>
                  <th style={{ width: 100 }}>Source</th>
                  <th style={{ width: 150 }}>Procedure</th>
                  <th style={{ width: 90 }}>SB Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleResults.slice(0, 200).map((r, i) => {
                  const stageMeta = r.ghl_stage ? STAGE_META[r.ghl_stage] : null
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{r.name || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.email}</div>
                      </td>
                      <td>{syncPill(r.syncStatus)}</td>
                      <td>
                        {stageMeta
                          ? <span className={`badge badge-${r.ghl_stage}`}>{stageMeta.label}</span>
                          : <span className="badge badge-none">—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 125 }} title={r.ghl_status}>
                        {r.ghl_status || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: SRC_COLORS[r.source] || '#888' }} />
                          {SRC_NAMES[r.source] || r.source || '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.procedure}>
                        {shortProc(r.procedure) || '—'}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(r.created)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {visibleResults.length > 200 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Showing first 200 of {visibleResults.length}</div>
          )}
        </div>
      )}
    </div>
  )
}

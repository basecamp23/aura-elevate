'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SRC_COLORS, pct, fmtDate } from '@/lib/utils'

interface SurgeryRow {
  id: number; patient_name: string; email: string | null; booked_date: string | null
  sx_date: string | null; sx_total: number | null; source: string | null
  ghl_stage: string | null; notes: string | null; cancelled: boolean; updated_at: string
  surgery_procedure: string | null; deposit: boolean; id_verified: boolean
  congrats_email: boolean; isc_sched_form: boolean; consent_sent: boolean
  consent_completed: boolean; consent_to_isc: boolean; pre_op_appt: boolean
  pif: boolean; post_op_appt: boolean; post_op_note: boolean; med_sent: boolean
  ride_confirmed: boolean; garments: boolean; preop_2wk: boolean; preop_5day_meds: boolean
  preop_24hr: boolean; pre_op_1wk: boolean; pre_op_24hr: boolean; post_op_24hr: boolean
  postop_24hr: boolean; postop_1wk: string | null; postop_1mo: string | null
  postop_3mo: string | null; postop_6mo: string | null; review: boolean
  flowers: boolean; photo_consent: boolean; symplast_notes: string | null
}

const CHECKLIST_SECTIONS = [
  {
    title: 'Admin & Onboarding',
    fields: [
      { key: 'deposit', label: 'Deposit' },
      { key: 'id_verified', label: 'ID Verified' },
      { key: 'congrats_email', label: 'Congrats Email' },
      { key: 'isc_sched_form', label: 'ISC Sched. Form' },
      { key: 'consent_sent', label: 'Consent Sent' },
      { key: 'consent_completed', label: 'Consent Done' },
      { key: 'consent_to_isc', label: 'Consent → ISC' },
      { key: 'pre_op_appt', label: 'Pre-Op Appt' },
      { key: 'pif', label: 'PIF' },
    ]
  },
  {
    title: 'Surgery Prep',
    fields: [
      { key: 'post_op_appt', label: 'Post-Op Appt' },
      { key: 'post_op_note', label: 'Post-Op Note' },
      { key: 'med_sent', label: 'Meds Sent' },
      { key: 'ride_confirmed', label: 'Ride Confirmed' },
      { key: 'garments', label: 'Garments' },
      { key: 'preop_2wk', label: '2 Wk Pre-Op' },
      { key: 'preop_5day_meds', label: '5 Day Meds' },
      { key: 'preop_24hr', label: '24 Hr Pre-Op' },
      { key: 'pre_op_1wk', label: '1 Wk Pre (Tracker)' },
      { key: 'pre_op_24hr', label: '24 Hr Pre (Tracker)' },
    ]
  },
  {
    title: 'Post-Op & Outcomes',
    fields: [
      { key: 'post_op_24hr', label: '24 Hr Post-Op' },
      { key: 'postop_24hr', label: 'P/O 24hr (Checklist)' },
      { key: 'review', label: '⭐ Review' },
      { key: 'flowers', label: '💐 Flowers' },
      { key: 'photo_consent', label: '📸 Photo Consent' },
    ]
  }
]

const ALL_BOOL_KEYS = CHECKLIST_SECTIONS.flatMap(s => s.fields.map(f => f.key))
const SRC_NAMES: Record<string, string> = { META: 'Meta', IG: 'Instagram', HYMAN: 'Hyman', REFERRAL: 'Referral' }

function CheckBox({ checked, onClick }: { checked: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} style={{
      width: 20, height: 20, borderRadius: 4, border: '0.5px solid',
      borderColor: checked ? '#1a7a4a' : 'var(--border2)',
      background: checked ? '#1a7a4a' : 'transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'all .1s',
    }}>
      {checked && <svg width={11} height={11} viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  )
}

function completionPct(row: SurgeryRow) {
  const done = ALL_BOOL_KEYS.filter(k => (row as any)[k]).length
  return Math.round(done / ALL_BOOL_KEYS.length * 100)
}

export default function RevenuePage() {
  const [rows, setRows] = useState<SurgeryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editState, setEditState] = useState<Partial<SurgeryRow>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('all')
  const [srcF, setSrcF] = useState('')
  const sb = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('surgery_revenue').select('*').order('sx_date', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(id: number, field: string, cur: boolean) {
    const val = !cur
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r))
    await sb.from('surgery_revenue').update({ [field]: val }).eq('id', id)
  }

  function startEdit(row: SurgeryRow) {
    setEditing(row.id)
    setEditState({ sx_total: row.sx_total, notes: row.notes, symplast_notes: row.symplast_notes, surgery_procedure: row.surgery_procedure, postop_3mo: row.postop_3mo, postop_6mo: row.postop_6mo })
  }

  async function saveEdit(id: number) {
    setSaving(true)
    const u: any = {
      sx_total: editState.sx_total ? parseFloat(String(editState.sx_total).replace(/[$,]/g, '')) : null,
      notes: editState.notes || null,
      symplast_notes: editState.symplast_notes || null,
      surgery_procedure: editState.surgery_procedure || null,
      postop_3mo: editState.postop_3mo || null,
      postop_6mo: editState.postop_6mo || null,
    }
    const { error } = await sb.from('surgery_revenue').update(u).eq('id', id)
    if (!error) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...u } : r))
      setEditing(null)
      setToast('Saved ✓')
      setTimeout(() => setToast(''), 2000)
    }
    setSaving(false)
  }

  const now = new Date()
  const filtered = rows.filter(r => {
    if (tab === 'upcoming') return !r.cancelled && r.sx_date && new Date(r.sx_date) >= now
    if (tab === 'completed') return !r.cancelled && r.sx_date && new Date(r.sx_date) < now
    if (tab === 'pending') return !r.cancelled && completionPct(r) < 100
    if (tab === 'cancelled') return r.cancelled
    return true
  }).filter(r => !srcF || (r.source || '').toUpperCase() === srcF)

  const totalRev = rows.filter(r => !r.cancelled).reduce((s, r) => s + (r.sx_total || 0), 0)
  const bySrc = rows.filter(r => !r.cancelled && r.sx_total && r.source).reduce((acc, r) => {
    const k = r.source!.toUpperCase(); acc[k] = (acc[k] || 0) + (r.sx_total || 0); return acc
  }, {} as Record<string, number>)

  if (loading) return <div className="loading-center"><span className="spinner" />Loading…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Revenue & Coordinator</div>
          <div className="page-sub">Surgery tracker · click row to expand checklist · all items editable live</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {toast && <span style={{ fontSize: 12, color: '#1a7a4a' }}>{toast}</span>}
          <button className="btn" onClick={load}>↺ Refresh</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">${totalRev.toLocaleString()}</div>
          <div className="metric-sub">{rows.filter(r => !r.cancelled && r.sx_total).length} surgeries</div>
        </div>
        {Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([src, rev]) => (
          <div className="metric-card" key={src}>
            <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: SRC_COLORS[src] || '#888', display: 'inline-block' }} />
              {SRC_NAMES[src] || src}
            </div>
            <div className="metric-value">${rev.toLocaleString()}</div>
            <div className="metric-sub up">{pct(rev, totalRev)}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        {[['all','All'],[' upcoming','Upcoming'],['completed','Completed'],['pending','Pending items'],['cancelled','Cancelled']].map(([k,l]) => (
          <button key={k} className={`filter-pill${tab === k.trim() ? ' active' : ''}`} onClick={() => setTab(k.trim())}>{l}</button>
        ))}
        <div className="divider" />
        <select className="fsel" value={srcF} onChange={e => setSrcF(e.target.value)}>
          <option value="">All sources</option>
          {['META','IG','HYMAN','REFERRAL'].map(s => <option key={s} value={s}>{SRC_NAMES[s]}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(row => {
          const done = completionPct(row)
          const isExp = expanded === row.id
          const isEd = editing === row.id
          const upcoming = row.sx_date && new Date(row.sx_date) >= now
          const color = SRC_COLORS[(row.source || '').toUpperCase()] || '#B4B2A9'

          return (
            <div key={row.id} className="card" style={{ padding: 0, opacity: row.cancelled ? 0.55 : 1 }}>
              {/* Summary row */}
              <div
                onClick={() => setExpanded(isExp ? null : row.id)}
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px 90px 90px 100px 1fr 20px', gap: 10, alignItems: 'center', padding: '11px 14px', cursor: 'pointer' }}
              >
                {/* % circle */}
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done === 100 ? '#EAF3DE' : done > 60 ? '#FAEEDA' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: done === 100 ? '#1a7a4a' : done > 60 ? '#854F0B' : 'var(--text3)' }}>{done}%</span>
                </div>
                {/* Name */}
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, textDecoration: row.cancelled ? 'line-through' : 'none' }}>{row.patient_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{row.email}</div>
                </div>
                {/* Booked */}
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  {fmtDate(row.booked_date)}
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>booked</div>
                </div>
                {/* SX date */}
                <div style={{ fontSize: 11, fontWeight: upcoming ? 600 : 400, color: upcoming ? '#185FA5' : 'var(--text2)' }}>
                  {fmtDate(row.sx_date)}
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 400 }}>sx date</div>
                </div>
                {/* Revenue */}
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {row.sx_total ? '$' + row.sx_total.toLocaleString() : <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: 11 }}>—</span>}
                </div>
                {/* Source */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {row.source || '—'}
                </div>
                {/* Quick checks */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  {[['review','Review'],['flowers','Flowers'],['photo_consent','Photo']].map(([f, l]) => (
                    <div key={f} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <CheckBox checked={(row as any)[f]} onClick={e => { e.stopPropagation(); toggle(row.id, f, (row as any)[f]) }} />
                      <span style={{ fontSize: 8, color: 'var(--text3)' }}>{l}</span>
                    </div>
                  ))}
                </div>
                {/* Progress bar + stage */}
                <div>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                    <div style={{ height: '100%', width: `${done}%`, background: done === 100 ? '#1a7a4a' : done > 60 ? '#BA7517' : '#378ADD', borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ghl_stage || 'No GHL stage'}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{isExp ? '▲' : '▼'}</div>
              </div>

              {/* Expanded */}
              {isExp && (
                <div style={{ borderTop: '0.5px solid var(--border)', padding: '14px 14px 12px', background: 'var(--surface2)' }}>
                  {/* Checklist */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 14 }}>
                    {CHECKLIST_SECTIONS.map(sec => (
                      <div key={sec.title}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{sec.title}</div>
                        {sec.fields.map(({ key, label }) => {
                          const val = (row as any)[key] as boolean
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                              <CheckBox checked={val} onClick={e => { e.stopPropagation(); toggle(row.id, key, val) }} />
                              <span style={{ fontSize: 12, color: val ? 'var(--text)' : 'var(--text2)' }}>{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Follow-up dates */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 12 }}>
                    {[['1 Wk P/O', fmtDate(row.postop_1wk)],['1 Mo P/O', fmtDate(row.postop_1mo)],['3 Mo P/O', row.postop_3mo || '—'],['6 Mo P/O', row.postop_6mo || '—']].map(([l,v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Edit form */}
                  {isEd ? (
                    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', border: '0.5px solid var(--border2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                        {[
                          ['Revenue ($)', 'sx_total', 'e.g. 12599'],
                          ['3 Mo P/O', 'postop_3mo', 'e.g. JULY'],
                          ['6 Mo P/O', 'postop_6mo', 'e.g. OCT'],
                        ].map(([l, k, ph]) => (
                          <div key={k}>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{l}</div>
                            <input className="search-input" style={{ width: '100%' }} placeholder={ph} value={(editState as any)[k] || ''} onChange={e => setEditState(p => ({ ...p, [k]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Notes</div>
                        <textarea className="search-input" style={{ width: '100%', minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }} value={editState.notes || ''} onChange={e => setEditState(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes…" />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Symplast notes</div>
                        <input className="search-input" style={{ width: '100%' }} value={editState.symplast_notes || ''} onChange={e => setEditState(p => ({ ...p, symplast_notes: e.target.value }))} placeholder="e.g. 1 incomplete note in Symplast" />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={() => saveEdit(row.id)} disabled={saving}>{saving ? '…' : 'Save'}</button>
                        <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        {row.symplast_notes && <div style={{ fontSize: 11, color: '#854F0B', background: '#FAEEDA', padding: '3px 8px', borderRadius: 4, marginBottom: 4, display: 'inline-block' }}>⚠ {row.symplast_notes}</div>}
                        {row.notes && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{row.notes}</div>}
                        {row.surgery_procedure && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Procedure: {row.surgery_procedure}</div>}
                      </div>
                      <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={() => startEdit(row)}>Edit details</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No records match</div>}
      </div>
    </div>
  )
}

export const SRC_COLORS: Record<string, string> = {
  ig: '#378ADD', fb: '#185FA5', google: '#3B6D11',
  hyman: '#D4537E', manychat: '#7F77DD', organic: '#639922',
  direct: '#888780', other: '#B4B2A9',
}

export const SRC_NAMES: Record<string, string> = {
  ig: 'Instagram', fb: 'Facebook', google: 'Google',
  hyman: 'Hyman Podcast', manychat: 'ManyChat / DM',
  organic: 'Organic Search', direct: 'Direct', other: 'Other',
}

export function inferSource(row: any): string {
  const src = (row.utm_source || '').toLowerCase()
  const med = (row.utm_medium || '').toLowerCase()
  const land = (row.landing_page || '').toLowerCase()
  if (land.includes('hymanpodcast')) return 'hyman'
  if (src === 'ig' || med.includes('instagram')) return 'ig'
  if (src === 'fb' || med.includes('facebook')) return 'fb'
  if (src.includes('manychat') || med.includes('manychat')) return 'manychat'
  if (src === 'google' || src.includes('google')) return 'google'
  if (src.includes('yahoo') || src.includes('duck') || src.includes('bing')) return 'organic'
  if (!src && !med) return 'direct'
  return 'other'
}

export function mapGHLStage(status: string, tags: string): string {
  const s = (status || '').toLowerCase()
  const t = (tags || '').toLowerCase()
  if (s.includes('surgery booked')) return 'booked'
  if (s.includes('consultation scheduled') || t.includes('booked appointment')) return 'consult'
  if (s.includes('no show')) return 'noshow'
  if (s.includes('attempting contact') || s.includes('contacted')) return 'contact'
  if (s.includes('not qualified') || s.includes('lost') || s.includes('sales-invalid')) return 'lost'
  if (s.includes('new lead') || s === 'new lead') return 'new'
  return 'other'
}

export function normEmail(e: string): string {
  return (e || '').toLowerCase().trim()
}

export function shortProc(p: string): string {
  return (p || '')
    .replace('Breast Augmentation - Fat Transfer (Using My Own Fat)', 'Fat Transfer')
    .replace('Aura Fill & Lift™ (Natural Breast Augmentation)', 'Fill & Lift™')
    .replace('Fat Transfer Augmentation', 'Fat Transfer')
    .replace('Other / Not Sure', 'Other')
}

export function pct(a: number, b: number): string {
  return b === 0 ? '0%' : Math.round((a / b) * 100) + '%'
}

export function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export const STAGE_META: Record<string, { label: string; color: string }> = {
  new:     { label: 'New Lead',       color: '#185FA5' },
  contact: { label: 'Contacted',      color: '#854F0B' },
  consult: { label: 'Consultation',   color: '#0F6E56' },
  booked:  { label: 'Surgery Booked', color: '#534AB7' },
  noshow:  { label: 'No Show',        color: '#A32D2D' },
  lost:    { label: 'Lost',           color: '#A32D2D' },
  other:   { label: 'Other',          color: '#888780' },
}

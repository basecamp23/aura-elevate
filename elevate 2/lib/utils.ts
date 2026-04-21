export const SRC_COLORS: Record<string, string> = {
  ig: '#378ADD', fb: '#185FA5', google: '#3B6D11',
  hyman: '#D4537E', manychat: '#7F77DD', organic: '#639922',
  direct: '#888780', other: '#B4B2A9',
  // Meta-assisted (view-through or cross-session)
  ig_assisted: '#378ADD', fb_assisted: '#185FA5',
}

export const SRC_NAMES: Record<string, string> = {
  ig: 'Instagram', fb: 'Facebook', google: 'Google',
  hyman: 'Hyman Podcast', manychat: 'ManyChat / DM',
  organic: 'Organic Search', direct: 'Direct', other: 'Other',
  ig_assisted: 'Instagram (assisted)', fb_assisted: 'Facebook (assisted)',
}

// Check if fbc cookie indicates a Meta click (even if UTM shows google/direct)
// fbc format: fb.1.{timestamp}.{fbclid}
function hasFbcCookie(row: any): boolean {
  const fbc = (row.fbc || '').trim()
  const fbclid = (row.fbclid || '').trim()
  return (fbc.startsWith('fb.') && fbc.length > 10) || fbclid.length > 10
}

function getFbcPlatform(row: any): 'ig' | 'fb' | null {
  if (!hasFbcCookie(row)) return null
  // Instagram clicks have ig in utm_medium or Instagram in landing page referrer
  const med = (row.utm_medium || '').toLowerCase()
  const land = (row.landing_page || '').toLowerCase()
  const src = (row.utm_source || '').toLowerCase()
  if (src === 'ig' || med.includes('instagram') || land.includes('instagram')) return 'ig'
  return 'fb'
}

export function inferSource(row: any): string {
  const src = (row.utm_source || '').toLowerCase()
  const med = (row.utm_medium || '').toLowerCase()
  const land = (row.landing_page || '').toLowerCase()

  // 1. Hyman podcast — check landing page first
  if (land.includes('hymanpodcast')) return 'hyman'

  // 2. Direct UTM match — highest confidence
  if (src === 'ig' || med.includes('instagram')) return 'ig'
  if (src === 'fb' || med.includes('facebook')) return 'fb'
  if (src.includes('manychat') || med.includes('manychat')) return 'manychat'

  // 3. No Meta UTM but fbclid/fbc cookie present = Meta drove the visit
  // even if they came back via Google/Direct later
  if (hasFbcCookie(row)) {
    const platform = getFbcPlatform(row)
    // If UTM shows google/direct but fbc exists → Meta assisted
    if (src === 'google' || src.includes('google')) return platform === 'ig' ? 'ig_assisted' : 'fb_assisted'
    if (!src && !med) return platform === 'ig' ? 'ig_assisted' : 'fb_assisted'
    // If UTM is blank but fbc exists → attribute to Meta
    return platform || 'fb'
  }

  // 4. Standard UTM fallback
  if (src === 'google' || src.includes('google')) return 'google'
  if (src.includes('yahoo') || src.includes('duck') || src.includes('bing')) return 'organic'
  if (!src && !med) return 'direct'
  return 'other'
}

// Returns true if Meta should get credit (direct OR assisted)
export function isMetaLead(row: any): boolean {
  const src = inferSource(row)
  return ['ig', 'fb', 'ig_assisted', 'fb_assisted'].includes(src)
}

// Returns display label with assisted indicator
export function sourceLabel(row: any): string {
  const src = inferSource(row)
  const name = SRC_NAMES[src] || src
  return name
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


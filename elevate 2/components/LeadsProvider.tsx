'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { inferSource, mapGHLStage, normEmail } from '@/lib/utils'

export interface Lead {
  id: number
  email: string
  first: string
  last: string
  phone: string
  created: string | null
  procedure: string
  disposition: string
  consultation_status: string
  source: string
  campaign: string
  content: string
  medium: string
  utm_source_raw: string
  landing: string
  source_property: string
  age_range: string
  comments: string
  fbc: string
  fbclid: string
  fbp: string
  meta_assisted: boolean
  ghl_status: string | null
  ghl_stage: string | null
}

interface GHLRow {
  status: string
  tags: string
  last_activity: string
}

interface LeadsCtx {
  leads: Lead[]
  loading: boolean
  connStatus: 'live' | 'err' | 'connecting'
  userEmail: string
  period: string
  setPeriod: (p: string) => void
  ghlMap: Record<string, GHLRow>
  setGHLMap: (m: Record<string, GHLRow>) => void
  reload: () => void
  filtered: Lead[]
}

const Ctx = createContext<LeadsCtx>({} as LeadsCtx)
export const useLeads = () => useContext(Ctx)

export function LeadsProvider({ children, userEmail }: { children: ReactNode; userEmail: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [connStatus, setConnStatus] = useState<'live' | 'err' | 'connecting'>('connecting')
  const [period, setPeriod] = useState('all')
  const [ghlMap, setGHLMapState] = useState<Record<string, GHLRow>>({})
  const sb = createClient()

  const mapRow = useCallback((row: any, ghlM: Record<string, GHLRow>): Lead => {
    const ghl = ghlM[normEmail(row.email)] || null
    const src = inferSource(row)
    const metaAssisted = src === 'ig_assisted' || src === 'fb_assisted'
    return {
      id: row.id,
      email: normEmail(row.email),
      first: (row.first_name || '').trim(),
      last: (row.last_name || '').trim(),
      phone: row.primary_phone || '',
      created: row.created_at || null,
      procedure: row.procedure_interest || '',
      disposition: row.disposition || '',
      consultation_status: row.consultation_status || '',
      source: src,
      campaign: row.utm_campaign || '',
      content: row.utm_content || '',
      medium: row.utm_medium || '',
      utm_source_raw: row.utm_source || '',
      landing: row.landing_page || '',
      source_property: row.source_property || '',
      age_range: row.age_range || '',
      comments: row.comments || '',
      fbc: row.fbc || '',
      fbclid: row.fbclid || '',
      fbp: row.fbp || '',
      meta_assisted: metaAssisted,
      ghl_status: ghl ? ghl.status : null,
      ghl_stage: ghl ? mapGHLStage(ghl.status, ghl.tags) : null,
    }
  }, [])

  const loadLeads = useCallback(async (ghlM = ghlMap) => {
    setLoading(true)
    setConnStatus('connecting')
    try {
      let rows: any[] = [], from = 0
      while (true) {
        const { data, error } = await sb.from('aura_ceremony')
          .select('id,created_at,first_name,last_name,email,primary_phone,zip_code,procedure_interest,landing_page,utm_source,utm_medium,utm_campaign,utm_content,disposition,consultation_status,source_property,age_range,comments,fbc,fbclid,fbp')
          .order('created_at', { ascending: false })
          .range(from, from + 999)
        if (error) throw error
        rows = rows.concat(data)
        if (data.length < 1000) break
        from += 1000
      }
      setLeads(rows.map(r => mapRow(r, ghlM)))
      setConnStatus('live')
    } catch {
      setConnStatus('err')
    } finally {
      setLoading(false)
    }
  }, [ghlMap, mapRow])

  useEffect(() => { loadLeads() }, [])

  function setGHLMap(m: Record<string, GHLRow>) {
    setGHLMapState(m)
    setLeads(prev => prev.map(l => {
      const ghl = m[l.email] || null
      return { ...l, ghl_status: ghl ? ghl.status : null, ghl_stage: ghl ? mapGHLStage(ghl.status, ghl.tags) : null }
    }))
  }

  function withinPeriod(d: string | null): boolean {
    if (!d || period === 'all') return true
    const days = period === '30d' ? 30 : 90
    return (Date.now() - new Date(d).getTime()) <= days * 86400000
  }

  const filtered = leads.filter(l => withinPeriod(l.created))

  return (
    <Ctx.Provider value={{ leads, loading, connStatus, userEmail, period, setPeriod, ghlMap, setGHLMap, reload: loadLeads, filtered }}>
      {children}
    </Ctx.Provider>
  )
}

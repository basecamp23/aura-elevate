'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor"/><rect x="9" y="1" width="5" height="5" rx="1" stroke="currentColor"/><rect x="1" y="9" width="5" height="5" rx="1" stroke="currentColor"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor"/></svg>
  )},
  { href: '/leads', label: 'All Leads', icon: (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="2.5" stroke="currentColor"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeLinecap="round"/></svg>
  )},
  { href: '/sources', label: 'Sources', icon: (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><path d="M1 11L5 7L8 10L12 4L14 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )},
  { href: '/revenue', label: 'Revenue', icon: (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><rect x="1" y="8" width="3" height="6" rx="1" stroke="currentColor"/><rect x="6" y="5" width="3" height="9" rx="1" stroke="currentColor"/><rect x="11" y="2" width="3" height="12" rx="1" stroke="currentColor"/></svg>
  )},
  { href: '/ghl', label: 'GHL Sync', icon: (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none"><path d="M7.5 1v4M7.5 10v4M1 7.5h4M10 7.5h4" stroke="currentColor" strokeLinecap="round"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor"/></svg>
  )},
]

interface SidebarProps {
  leadCount?: number
  connStatus?: 'live' | 'err' | 'connecting'
  userEmail?: string
}

export default function Sidebar({ leadCount, connStatus = 'connecting', userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const sb = createClient()

  async function signOut() {
    await sb.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 14 14" fill="none" width={14} height={14}>
            <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.5 8H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="logo-text">Elevate</div>
          <div className="logo-sub">Aura Aesthetica</div>
        </div>
      </div>

      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item${pathname === item.href ? ' active' : ''}`}
          style={{ opacity: 0.75 }}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}

      <div className="sidebar-footer">
        <div className="conn-status">
          <div className={`conn-dot${connStatus === 'live' ? ' live' : connStatus === 'err' ? ' err' : ''}`} />
          <span>{connStatus === 'live' ? 'Supabase live' : connStatus === 'err' ? 'Connection error' : 'Connecting…'}</span>
        </div>
        {leadCount !== undefined && (
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{leadCount.toLocaleString()} leads loaded</div>
        )}
        {userEmail && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11, width: '100%' }} onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  )
}

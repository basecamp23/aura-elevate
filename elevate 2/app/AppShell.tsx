'use client'
import Sidebar from '@/components/Sidebar'
import { LeadsProvider, useLeads } from '@/components/LeadsProvider'

function Shell({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
  const { connStatus, leads } = useLeads()
  return (
    <div className="shell">
      <Sidebar connStatus={connStatus} leadCount={leads.length} userEmail={userEmail} />
      <div className="main">{children}</div>
    </div>
  )
}

export default function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
  return (
    <LeadsProvider userEmail={userEmail}>
      <Shell userEmail={userEmail}>{children}</Shell>
    </LeadsProvider>
  )
}

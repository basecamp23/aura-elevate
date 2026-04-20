import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import AppShell from '../AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  return <AppShell userEmail={user.email || ''}>{children}</AppShell>
}

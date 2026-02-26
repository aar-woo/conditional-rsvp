import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ClaimInvite } from '@/components/ClaimInvite'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params

  // Use admin client (no cookie auth) so the lookup always bypasses RLS —
  // the SSR service client leaks the user's JWT into the Authorization header
  // when a user is logged in, causing RLS to block null-user_id invites.
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('invites')
    .select('*, events(title, event_date, location)')
    .eq('token', token)
    .single()

  const supabase = await createClient()

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid invite link</h1>
          <p className="text-muted-foreground">This invite link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  // Check if already claimed and user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (invite.claimed && user) {
    redirect(`/events/${invite.event_id}`)
  }

  return <ClaimInvite invite={invite} user={user} />
}

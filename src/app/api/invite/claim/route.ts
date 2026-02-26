import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_id } = await request.json()
  if (!invite_id) return NextResponse.json({ error: 'Missing invite_id' }, { status: 400 })

  // Use admin client so RLS doesn't block updating null-user_id invites
  const admin = createAdminClient()

  const { data: invite, error } = await admin
    .from('invites')
    .update({ user_id: user.id, claimed: true })
    .eq('id', invite_id)
    .is('claimed', false)      // only claim unclaimed invites
    .select('event_id')
    .single()

  if (error || !invite) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to claim invite' },
      { status: 500 }
    )
  }

  return NextResponse.json({ event_id: invite.event_id })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { event_id, invite_method, contact_value, target_user_id } = body

  if (!event_id || !invite_method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // For username-based invites, user_id is known immediately
  const userId = invite_method === 'username' ? target_user_id : null

  const { data: invite, error: inviteError } = await serviceClient
    .from('invites')
    .insert({
      event_id,
      user_id: userId,
      invited_by: user.id,
      invite_method,
      contact_value: contact_value ?? null,
    })
    .select()
    .single()

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: inviteError?.message ?? 'Failed to create invite' },
      { status: 500 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  // Send SMS via Twilio
  if (invite_method === 'phone' && contact_value) {
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', event_id)
        .single()

      const twilio = await import('twilio')
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      )
      await client.messages.create({
        body: `You're invited to "${eventData?.title ?? 'an event'}"! Join here: ${inviteUrl}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: contact_value,
      })
    } catch (smsError) {
      console.error('Twilio error:', smsError)
      // Don't fail the invite creation if SMS fails
    }
  }

  // For email invites, use Supabase magic link or a simple response
  if (invite_method === 'email' && contact_value) {
    // In production, send email via Resend/SendGrid/Supabase
    // For now, return the invite URL so the host can share it
    return NextResponse.json({ invite, inviteUrl })
  }

  return NextResponse.json({ invite, inviteUrl })
}

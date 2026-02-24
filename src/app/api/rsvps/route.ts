import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveConditions } from '@/lib/condition-resolver'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { event_id, response, conditions } = body

  if (!event_id || !response) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Determine initial resolved_response
  let resolved_response: string
  if (response === 'yes') resolved_response = 'yes'
  else if (response === 'no') resolved_response = 'no'
  else if (response === 'maybe') resolved_response = 'pending'
  else resolved_response = 'pending' // conditional starts as pending

  // Upsert the RSVP
  const { data: rsvp, error: rsvpError } = await supabase
    .from('rsvps')
    .upsert(
      { event_id, user_id: user.id, response, resolved_response, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single()

  if (rsvpError || !rsvp) {
    return NextResponse.json({ error: rsvpError?.message ?? 'Failed to save RSVP' }, { status: 500 })
  }

  // Delete old conditions and insert new ones (for conditional RSVPs)
  await supabase.from('rsvp_conditions').delete().eq('rsvp_id', rsvp.id)

  if (response === 'conditional' && Array.isArray(conditions) && conditions.length > 0) {
    const conditionRows = conditions.map((c: { condition_type: string; threshold?: number; target_user_id?: string }) => ({
      rsvp_id: rsvp.id,
      condition_type: c.condition_type,
      threshold: c.condition_type === 'min_attendees' ? c.threshold : null,
      target_user_id: c.condition_type === 'specific_user' ? c.target_user_id : null,
      is_met: false,
    }))
    await supabase.from('rsvp_conditions').insert(conditionRows)
  }

  // Run condition resolution with service client (bypasses RLS)
  const serviceClient = await createServiceClient()
  await resolveConditions(serviceClient, event_id)

  return NextResponse.json({ rsvp })
}

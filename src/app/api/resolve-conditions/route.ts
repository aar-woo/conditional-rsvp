import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveConditions } from '@/lib/condition-resolver'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id } = await request.json()
  if (!event_id) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  const serviceClient = await createServiceClient()
  await resolveConditions(serviceClient, event_id)

  return NextResponse.json({ success: true })
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Rsvp, RsvpCondition, Profile } from '@/types'

export interface AttendeeRsvp {
  user_id: string
  profile: Profile | null
  rsvp: (Rsvp & { rsvp_conditions?: RsvpCondition[] }) | null
}

export function useEventRsvps(eventId: string) {
  const supabase = createClient()
  const [attendees, setAttendees] = useState<AttendeeRsvp[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAttendees = useCallback(async () => {
    const { data: invites } = await supabase
      .from('invites')
      .select('user_id, profiles(*)')
      .eq('event_id', eventId)
      .not('user_id', 'is', null)

    if (!invites) { setLoading(false); return }

    const userIds = invites.map((i: { user_id: string }) => i.user_id)

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('*, rsvp_conditions(*, profiles(*))')
      .eq('event_id', eventId)
      .in('user_id', userIds)

    const rsvpMap = new Map<string, Rsvp & { rsvp_conditions?: RsvpCondition[] }>(
      (rsvps ?? []).map(r => [r.user_id, r])
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: AttendeeRsvp[] = (invites as any[]).map((inv) => ({
      user_id: inv.user_id as string,
      profile: inv.profiles as Profile | null,
      rsvp: rsvpMap.get(inv.user_id) ?? null,
    }))

    setAttendees(result)
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    fetchAttendees()

    // Subscribe to RSVP changes
    const channel = supabase
      .channel(`event-rsvps-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps', filter: `event_id=eq.${eventId}` },
        () => fetchAttendees()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvp_conditions' },
        () => fetchAttendees()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, fetchAttendees, supabase])

  return { attendees, loading, refetch: fetchAttendees }
}

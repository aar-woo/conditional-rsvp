import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/EventCard'
import { Plus } from 'lucide-react'
import type { Event, Rsvp } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: hostedEvents }, { data: invitedRaw }] = await Promise.all([
    supabase
      .from('events')
      .select('*, profiles(*)')
      .eq('created_by', user.id)
      .order('event_date', { ascending: true }),
    supabase
      .from('invites')
      .select('event_id, events(*, profiles(*))')
      .eq('user_id', user.id),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invitedEvents: Event[] = (invitedRaw ?? [] as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((inv: any) => inv.events as Event | null)
    .filter((e): e is Event => !!e && e.created_by !== user.id)

  // Fetch my RSVPs to show greenlit status
  const eventIds = invitedEvents.map(e => e.id)
  const { data: myRsvps } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('*')
        .eq('user_id', user.id)
        .in('event_id', eventIds)
    : { data: [] }

  const rsvpMap = new Map<string, Rsvp>((myRsvps ?? []).map((r: Rsvp) => [r.event_id, r]))

  return (
    <div className="space-y-10">
      {/* Hosting */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Events I&apos;m hosting</h2>
          <Button asChild size="sm">
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-1" />
              New event
            </Link>
          </Button>
        </div>
        {(hostedEvents ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p className="mb-3">No events yet.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/events/new">Create your first event</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(hostedEvents ?? []).map(event => (
              <EventCard key={event.id} event={event} isHost />
            ))}
          </div>
        )}
      </section>

      {/* Invited to */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Events I&apos;m invited to</h2>
        {invitedEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p>No invitations yet. Ask a friend to invite you!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {invitedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                rsvp={rsvpMap.get(event.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

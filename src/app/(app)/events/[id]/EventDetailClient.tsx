'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AttendeeList } from '@/components/AttendeeList'
import { RsvpModal } from '@/components/RsvpModal'
import { InviteModal } from '@/components/InviteModal'
import { useEventRsvps } from '@/hooks/useEventRsvps'
import { CalendarDays, MapPin, UserPlus, Zap } from 'lucide-react'
import type { Event, Rsvp } from '@/types'

interface EventDetailClientProps {
  event: Event
  currentUserId: string
  initialRsvp: Rsvp | null
  isHost: boolean
}

export function EventDetailClient({
  event,
  currentUserId,
  initialRsvp,
  isHost,
}: EventDetailClientProps) {
  const [rsvpOpen, setRsvpOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const { attendees, loading, refetch } = useEventRsvps(event.id)

  const myAttendee = attendees.find(a => a.user_id === currentUserId)
  const myRsvp = myAttendee?.rsvp ?? initialRsvp
  const isGreenlit = myRsvp?.resolved_response === 'yes'

  const confirmedCount = attendees.filter(a => a.rsvp?.resolved_response === 'yes').length

  return (
    <div className="space-y-6">
      {/* Greenlit banner */}
      {isGreenlit && myRsvp?.response === 'conditional' && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 p-4 flex items-center gap-3">
          <Zap className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">You&apos;re greenlit!</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              All your conditions have been met. You&apos;re going!
            </p>
          </div>
        </div>
      )}

      {/* Event info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{event.title}</h1>
          {event.status === 'cancelled' && (
            <Badge variant="destructive">Cancelled</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          )}
        </div>
        {event.description && (
          <p className="text-muted-foreground">{event.description}</p>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setRsvpOpen(true)}>
          {myRsvp ? 'Update RSVP' : 'RSVP'}
        </Button>
        {isHost && (
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Invite people
          </Button>
        )}
        {myRsvp && (
          <Badge
            variant={
              myRsvp.resolved_response === 'yes'
                ? 'default'
                : myRsvp.resolved_response === 'no'
                ? 'destructive'
                : 'secondary'
            }
            className="self-center py-1 px-3"
          >
            Your RSVP: {myRsvp.response === 'conditional'
              ? `Conditional (${myRsvp.resolved_response})`
              : myRsvp.response}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Attendees */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            Attendees{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({confirmedCount} confirmed · {attendees.length} invited)
            </span>
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <AttendeeList attendees={attendees} />
        )}
      </div>

      <RsvpModal
        open={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        eventId={event.id}
        currentRsvp={myRsvp}
        onSuccess={refetch}
      />

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        eventId={event.id}
      />
    </div>
  )
}

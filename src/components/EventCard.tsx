import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Zap } from 'lucide-react'
import type { Event, Rsvp } from '@/types'

interface EventCardProps {
  event: Event
  rsvp?: Rsvp
  isHost?: boolean
}

export function EventCard({ event, rsvp, isHost }: EventCardProps) {
  const date = new Date(event.event_date)
  const isGreenlit = rsvp?.resolved_response === 'yes'
  const isPast = date < new Date()

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              {isGreenlit && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                  <Zap className="h-3 w-3 mr-1" />
                  Greenlit
                </Badge>
              )}
              {isHost && (
                <Badge variant="outline" className="text-xs">Host</Badge>
              )}
              {event.status === 'cancelled' && (
                <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className={isPast ? 'line-through' : ''}>
              {date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {rsvp && (
            <div className="pt-1">
              <Badge
                variant={
                  rsvp.resolved_response === 'yes'
                    ? 'default'
                    : rsvp.resolved_response === 'no'
                    ? 'destructive'
                    : 'secondary'
                }
                className="text-xs"
              >
                {rsvp.response === 'conditional'
                  ? `Conditional (${rsvp.resolved_response})`
                  : rsvp.response}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

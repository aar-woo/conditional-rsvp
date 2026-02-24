import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Zap, Clock, X, Check, HelpCircle } from 'lucide-react'
import type { Rsvp, RsvpCondition, Profile } from '@/types'

interface AttendeeWithRsvp {
  user_id: string
  profile: Profile | null
  rsvp: (Rsvp & { rsvp_conditions?: RsvpCondition[] }) | null
}

interface AttendeeListProps {
  attendees: AttendeeWithRsvp[]
}

function RsvpStatusIcon({ resolved }: { resolved: string }) {
  if (resolved === 'yes') return <Check className="h-3.5 w-3.5 text-green-600" />
  if (resolved === 'no') return <X className="h-3.5 w-3.5 text-red-500" />
  return <Clock className="h-3.5 w-3.5 text-amber-500" />
}

function getInitials(profile: Profile | null): string {
  if (!profile) return '?'
  const name = profile.display_name || profile.username
  return name.slice(0, 2).toUpperCase()
}

export function AttendeeList({ attendees }: AttendeeListProps) {
  if (attendees.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendees yet.</p>
  }

  return (
    <ul className="space-y-3">
      {attendees.map(({ user_id, profile, rsvp }) => {
        const isGreenlit = rsvp?.resolved_response === 'yes'
        return (
          <li key={user_id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">{getInitials(profile)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {profile?.display_name || profile?.username || 'Unknown'}
                </span>
                {profile?.username && (
                  <span className="text-xs text-muted-foreground">@{profile.username}</span>
                )}
                {isGreenlit && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-xs py-0">
                    <Zap className="h-2.5 w-2.5 mr-1" />
                    Greenlit
                  </Badge>
                )}
              </div>
              {rsvp ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <RsvpStatusIcon resolved={rsvp.resolved_response} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {rsvp.response === 'conditional'
                      ? `Conditional → ${rsvp.resolved_response}`
                      : rsvp.response}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">No response</span>
                </div>
              )}
              {/* Show conditions */}
              {rsvp?.rsvp_conditions && rsvp.rsvp_conditions.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {rsvp.rsvp_conditions.map(c => (
                    <li key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={c.is_met ? 'text-green-600' : 'text-amber-500'}>
                        {c.is_met ? '✓' : '○'}
                      </span>
                      {c.condition_type === 'min_attendees'
                        ? `At least ${c.threshold} people going`
                        : c.profiles
                        ? `${c.profiles.display_name || c.profiles.username} is going`
                        : 'Specific person is going'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export type EventStatus = 'active' | 'cancelled'
export type RsvpResponse = 'yes' | 'no' | 'maybe' | 'conditional'
export type ResolvedResponse = 'yes' | 'no' | 'pending'
export type ConditionType = 'min_attendees' | 'specific_user'
export type InviteMethod = 'username' | 'email' | 'phone'

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  phone: string | null
  created_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  event_date: string
  created_by: string
  created_at: string
  status: EventStatus
  profiles?: Profile
}

export interface Invite {
  id: string
  event_id: string
  user_id: string | null
  invited_by: string
  invite_method: InviteMethod
  contact_value: string | null
  token: string
  claimed: boolean
  created_at: string
  profiles?: Profile
}

export interface Rsvp {
  id: string
  event_id: string
  user_id: string
  response: RsvpResponse
  resolved_response: ResolvedResponse
  updated_at: string
  profiles?: Profile
  rsvp_conditions?: RsvpCondition[]
}

export interface RsvpCondition {
  id: string
  rsvp_id: string
  condition_type: ConditionType
  threshold: number | null
  target_user_id: string | null
  is_met: boolean
  profiles?: Profile
}

export interface AttendeeWithRsvp {
  invite: Invite
  rsvp: Rsvp | null
}

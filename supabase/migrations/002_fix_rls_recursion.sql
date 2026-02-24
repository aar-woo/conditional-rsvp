-- Fix infinite recursion in RLS policies caused by circular references:
-- events policy → invites, invites policy → events

-- Drop the circular policies
drop policy if exists "Invited users can read events" on events;
drop policy if exists "Event participants can view invites" on invites;
drop policy if exists "Event participants can view RSVPs" on rsvps;
drop policy if exists "Event participants can view conditions" on rsvp_conditions;

-- Fix invites policy: remove the events subquery (event creator is always invited_by)
create policy "Event participants can view invites"
  on invites for select
  to authenticated
  using (
    user_id = auth.uid()
    or invited_by = auth.uid()
  );

-- Fix events policy: use a security definer function to avoid RLS recursion
create or replace function public.is_invited_to_event(event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from invites
    where invites.event_id = $1
      and invites.user_id = auth.uid()
  );
$$;

create policy "Invited users can read events"
  on events for select
  to authenticated
  using (public.is_invited_to_event(id));

-- Fix rsvps policy: use security definer function to avoid recursion
create or replace function public.is_event_participant(event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from invites
    where invites.event_id = $1
      and (invites.user_id = auth.uid() or invites.invited_by = auth.uid())
  )
  or exists (
    select 1 from events
    where events.id = $1
      and events.created_by = auth.uid()
  );
$$;

create policy "Event participants can view RSVPs"
  on rsvps for select
  to authenticated
  using (public.is_event_participant(event_id));

-- Fix rsvp_conditions policy
create policy "Event participants can view conditions"
  on rsvp_conditions for select
  to authenticated
  using (
    exists (
      select 1 from rsvps
      where rsvps.id = rsvp_conditions.rsvp_id
        and (
          rsvps.user_id = auth.uid()
          or public.is_event_participant(rsvps.event_id)
        )
    )
  );

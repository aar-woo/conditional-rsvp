-- New enum
create type condition_visibility as enum ('private', 'host', 'group');

-- Add column to rsvps (default 'group' preserves current behavior)
alter table rsvps
  add column condition_visibility condition_visibility not null default 'private';

-- Helper: is current user the event host?
create or replace function public.is_event_host(event_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from events where events.id = $1 and events.created_by = auth.uid()
  );
$$;

-- Replace existing rsvp_conditions SELECT policy with visibility-aware version
drop policy if exists "Event participants can view conditions" on rsvp_conditions;

create policy "Visibility-aware condition viewing"
  on rsvp_conditions for select to authenticated
  using (
    exists (
      select 1 from rsvps
      where rsvps.id = rsvp_conditions.rsvp_id
        and (
          -- Owner always sees their own conditions
          rsvps.user_id = auth.uid()
          -- Host sees conditions when visibility is 'host' or 'group'
          or (
            rsvps.condition_visibility in ('host', 'group')
            and public.is_event_host(rsvps.event_id)
          )
          -- Participants see conditions only when visibility is 'group'
          or (
            rsvps.condition_visibility = 'group'
            and public.is_event_participant(rsvps.event_id)
          )
        )
    )
  );

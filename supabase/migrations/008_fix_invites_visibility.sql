-- Fix: allow any event participant to view all invites for an event.
-- Previously the policy only allowed user_id = auth.uid() OR invited_by = auth.uid(),
-- which meant invited users could only see their own invite and never saw other attendees.
-- is_event_participant is security definer so it bypasses RLS internally — no recursion.

drop policy if exists "Event participants can view invites" on invites;

create policy "Event participants can view invites"
  on invites for select to authenticated
  using (public.is_event_participant(event_id));

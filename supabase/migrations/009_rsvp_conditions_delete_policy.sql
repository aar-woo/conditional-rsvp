-- Users had no DELETE policy on rsvp_conditions, causing the API's
-- delete-then-insert pattern to silently fail and duplicate conditions.
create policy "Users can delete their own conditions"
  on rsvp_conditions for delete
  to authenticated
  using (
    exists (
      select 1 from rsvps
      where rsvps.id = rsvp_conditions.rsvp_id
        and rsvps.user_id = auth.uid()
    )
  );

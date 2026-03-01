-- Convert any existing 'maybe' RSVPs to 'conditional' (no conditions → stays pending)
update rsvps set response = 'conditional' where response = 'maybe';

-- PostgreSQL doesn't support dropping enum values directly.
-- Create a new enum without 'maybe', swap the column, then drop the old type.
create type rsvp_response_new as enum ('yes', 'no', 'conditional');

alter table rsvps
  alter column response type rsvp_response_new
  using response::text::rsvp_response_new;

drop type rsvp_response;
alter type rsvp_response_new rename to rsvp_response;

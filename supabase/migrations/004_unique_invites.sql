-- Deduplicate existing invites before adding unique constraints,
-- keeping the oldest invite for each duplicate group.
delete from invites where id in (
  select id from (
    select id, row_number() over (
      partition by event_id, user_id order by created_at
    ) as rn
    from invites where user_id is not null
  ) t where rn > 1
);

delete from invites where id in (
  select id from (
    select id, row_number() over (
      partition by event_id, contact_value order by created_at
    ) as rn
    from invites where contact_value is not null
  ) t where rn > 1
);

-- Prevent duplicate invites to the same event.
-- Two partial indexes cover both cases:
--   1. username invites: unique on (event_id, user_id) when user_id is set
--   2. email/phone invites: unique on (event_id, contact_value) when contact_value is set

create unique index invites_unique_user
  on invites (event_id, user_id)
  where user_id is not null;

create unique index invites_unique_contact
  on invites (event_id, contact_value)
  where contact_value is not null;

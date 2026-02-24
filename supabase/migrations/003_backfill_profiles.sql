-- Backfill profiles for any auth users who don't have one yet
-- (users created before the trigger was installed)
insert into public.profiles (id, username, display_name, avatar_url, phone)
select
  id,
  coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url',
  raw_user_meta_data->>'phone'
from auth.users
on conflict (id) do nothing;

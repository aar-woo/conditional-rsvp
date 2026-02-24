-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type event_status as enum ('active', 'cancelled');
create type rsvp_response as enum ('yes', 'no', 'maybe', 'conditional');
create type resolved_response as enum ('yes', 'no', 'pending');
create type condition_type as enum ('min_attendees', 'specific_user');
create type invite_method as enum ('username', 'email', 'phone');

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  phone text unique,
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ============================================================
-- EVENTS
-- ============================================================
create table events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  location text,
  event_date timestamptz not null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  status event_status default 'active' not null
);

alter table events enable row level security;

-- Users can read events they created
create policy "Event creators can read their events"
  on events for select
  to authenticated
  using (created_by = auth.uid());

-- Users can read events they are invited to
create policy "Invited users can read events"
  on events for select
  to authenticated
  using (
    exists (
      select 1 from invites
      where invites.event_id = events.id
        and invites.user_id = auth.uid()
    )
  );

create policy "Users can create events"
  on events for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Event creators can update their events"
  on events for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Event creators can delete their events"
  on events for delete
  to authenticated
  using (created_by = auth.uid());

-- ============================================================
-- INVITES
-- ============================================================
create table invites (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  invited_by uuid not null references profiles(id) on delete cascade,
  invite_method invite_method not null,
  contact_value text,
  token uuid unique default uuid_generate_v4() not null,
  claimed boolean default false not null,
  created_at timestamptz default now() not null
);

alter table invites enable row level security;

create policy "Event participants can view invites"
  on invites for select
  to authenticated
  using (
    user_id = auth.uid()
    or invited_by = auth.uid()
    or exists (
      select 1 from events
      where events.id = invites.event_id
        and events.created_by = auth.uid()
    )
  );

create policy "Event creators can insert invites"
  on invites for insert
  to authenticated
  with check (invited_by = auth.uid());

create policy "Users can claim their own invite"
  on invites for update
  to authenticated
  using (user_id = auth.uid() or user_id is null);

-- Allow reading invites by token (for claim flow) — service role handles this
create policy "Service role can manage invites"
  on invites for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- RSVPS
-- ============================================================
create table rsvps (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  response rsvp_response not null,
  resolved_response resolved_response default 'pending' not null,
  updated_at timestamptz default now() not null,
  unique(event_id, user_id)
);

alter table rsvps enable row level security;

create policy "Event participants can view RSVPs"
  on rsvps for select
  to authenticated
  using (
    exists (
      select 1 from invites
      where invites.event_id = rsvps.event_id
        and (invites.user_id = auth.uid() or invites.invited_by = auth.uid())
    )
    or exists (
      select 1 from events
      where events.id = rsvps.event_id
        and events.created_by = auth.uid()
    )
  );

create policy "Users can manage their own RSVPs"
  on rsvps for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own RSVPs"
  on rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Service role can manage RSVPs"
  on rsvps for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- RSVP CONDITIONS
-- ============================================================
create table rsvp_conditions (
  id uuid primary key default uuid_generate_v4(),
  rsvp_id uuid not null references rsvps(id) on delete cascade,
  condition_type condition_type not null,
  threshold integer,
  target_user_id uuid references profiles(id) on delete set null,
  is_met boolean default false not null
);

alter table rsvp_conditions enable row level security;

create policy "Event participants can view conditions"
  on rsvp_conditions for select
  to authenticated
  using (
    exists (
      select 1 from rsvps
      where rsvps.id = rsvp_conditions.rsvp_id
        and (
          rsvps.user_id = auth.uid()
          or exists (
            select 1 from invites
            where invites.event_id = rsvps.event_id
              and invites.invited_by = auth.uid()
          )
          or exists (
            select 1 from events
            where events.id = rsvps.event_id
              and events.created_by = auth.uid()
          )
        )
    )
  );

create policy "Users can manage their own conditions"
  on rsvp_conditions for insert
  to authenticated
  with check (
    exists (
      select 1 from rsvps
      where rsvps.id = rsvp_conditions.rsvp_id
        and rsvps.user_id = auth.uid()
    )
  );

create policy "Users can update their own conditions"
  on rsvp_conditions for update
  to authenticated
  using (
    exists (
      select 1 from rsvps
      where rsvps.id = rsvp_conditions.rsvp_id
        and rsvps.user_id = auth.uid()
    )
  );

create policy "Service role can manage conditions"
  on rsvp_conditions for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table rsvps;
alter publication supabase_realtime add table rsvp_conditions;

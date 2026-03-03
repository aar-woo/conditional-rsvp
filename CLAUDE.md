# Greenlight — CLAUDE.md

## Project

Conditional RSVP app. Users RSVP to events with optional conditions (min attendees, specific user must confirm). Next.js 16, Supabase (PostgreSQL + Auth + Realtime), Tailwind, shadcn/ui, Twilio SMS.

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run test      # vitest run
npm run test:watch
supabase db push  # apply migrations
```

## Architecture

### Supabase clients

- `createClient()` — SSR client, respects RLS (for logged-in user operations)
- `createAdminClient()` — service role, bypasses RLS (use for invite claiming, condition resolution, any op that must ignore the caller's auth state)
- **Never use `createServiceClient()` server-side for admin ops** — it leaks the user JWT and doesn't truly bypass RLS for logged-in users

### Key API routes

- `POST /api/rsvps` — save RSVP + conditions, triggers condition resolution
- `POST /api/resolve-conditions` — re-evaluate conditions for an event (cascading loop, max 10 iterations)
- `POST /api/invite/send` — create invite (username/email/phone), SMS via Twilio
- `POST /api/invite/claim` — claim invite by token (requires admin client)

### Conditional RSVP system

- Response types: `yes` | `no` | `conditional`
- Condition types: `min_attendees` (number) | `specific_user` (user_id)
- Resolution: cascading loop up to 10 iterations — handles chains (A goes if B goes if 3+ attend)
- Resolved response: `yes` | `no` | `pending`

### Condition visibility

- `private` — only owner sees conditions
- `host` — owner + event host
- `group` — all event participants
- Enforced via RLS (`is_event_participant()`, `is_event_host()` SQL functions)

### Invite system

- Three methods: `username` (direct lookup), `email`, `phone` (Twilio)
- Unclaimed invites have `user_id = null`
- Dashboard auto-claims email/phone invites matching the logged-in user on load
- Claiming null-user_id invites requires admin client

### Real-time

- `useEventRsvps()` hook subscribes to `postgres_changes` on `rsvps` and `rsvp_conditions`

## Key files

- `src/lib/supabase/server.ts` — Supabase client factories
- `src/lib/condition-resolver.ts` — condition resolution logic
- `src/components/RsvpModal.tsx` — RSVP dialog (yes/no/conditional + visibility)
- `src/components/ConditionBuilder.tsx` — condition editor
- `src/hooks/useEventRsvps.ts` — real-time attendee hook
- `src/types/index.ts` — all TypeScript types
- `supabase/migrations/` — schema history (8 migrations)

## Database enums

- `rsvp_response`: `yes | no | conditional`
- `resolved_response`: `yes | no | pending`
- `condition_type`: `min_attendees | specific_user`
- `invite_method`: `username | email | phone`
- `condition_visibility`: `private | host | group`

## Conventions

- No "Co-Authored-By: Claude" lines in commits
- Migrations in `supabase/migrations/`, named `NNN_description.sql`
- Use admin client for any server op that must bypass RLS regardless of user state
- shadcn/ui for UI components; Lucide for icons; Sonner for toasts

## Claude Instructions

- Before writing any code, read the relevant files, analyze the problem, list 2-3 approaches, then plan your implementation before coding.

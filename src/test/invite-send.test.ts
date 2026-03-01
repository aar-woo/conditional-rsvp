import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: 'host-id', email: 'host@test.com' }
const mockEvent = { id: 'event-id', title: 'Test Party', created_by: 'host-id' }
const mockInvite = {
  id: 'invite-id',
  event_id: 'event-id',
  token: 'test-token-uuid',
  invite_method: 'email',
  contact_value: 'guest@test.com',
}

// ── Mock helpers ─────────────────────────────────────────────────────────────

/** Returns a Supabase query chain that resolves to `result` on `.single()` */
function queryChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  } as Record<string, unknown>
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  return chain
}

// fromMock returns different chains depending on which table is queried
function makeFromMock({
  eventResult,
  inviteResult,
}: {
  eventResult: unknown
  inviteResult?: unknown
}) {
  return vi.fn((table: string) => {
    if (table === 'events') return queryChain(eventResult)
    if (table === 'invites') return queryChain(inviteResult ?? { data: null, error: null })
    return queryChain({ data: null, error: null })
  })
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: { create: vi.fn().mockResolvedValue({ sid: 'SM123' }) },
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/invite/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/invite/send', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id', invite_method: 'email' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn(),
    } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/missing/i)
  })

  it('returns 403 when caller does not own the event', async () => {
    const from = makeFromMock({ eventResult: { data: null, error: { message: 'not found' } } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from,
    } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id', invite_method: 'email', contact_value: 'x@x.com' }))
    expect(res.status).toBe(403)
  })

  it('sends email invite and returns invite URL', async () => {
    const from = makeFromMock({
      eventResult: { data: mockEvent, error: null },
      inviteResult: { data: mockInvite, error: null },
    })
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from,
    } as never)
    vi.mocked(createServiceClient).mockResolvedValue({ from } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id', invite_method: 'email', contact_value: 'guest@test.com' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.inviteUrl).toContain('test-token-uuid')
  })

  it('sends username invite with target user_id set', async () => {
    const usernameInvite = { ...mockInvite, invite_method: 'username', user_id: 'guest-id', contact_value: null }
    const from = makeFromMock({
      eventResult: { data: mockEvent, error: null },
      inviteResult: { data: usernameInvite, error: null },
    })
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from,
    } as never)
    vi.mocked(createServiceClient).mockResolvedValue({ from } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id', invite_method: 'username', target_user_id: 'guest-id' }))

    expect(res.status).toBe(200)
    expect((await res.json()).invite.user_id).toBe('guest-id')
  })

  it('sends phone invite and attempts Twilio', async () => {
    const phoneInvite = { ...mockInvite, invite_method: 'phone', contact_value: '+15550001234' }
    const from = makeFromMock({
      eventResult: { data: mockEvent, error: null },
      inviteResult: { data: phoneInvite, error: null },
    })
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from,
    } as never)
    vi.mocked(createServiceClient).mockResolvedValue({ from } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id', invite_method: 'phone', contact_value: '+15550001234' }))
    expect(res.status).toBe(200)
  })

  it('returns 409 on duplicate invite', async () => {
    const from = makeFromMock({
      eventResult: { data: mockEvent, error: null },
      inviteResult: { data: null, error: { code: '23505', message: 'duplicate key value' } },
    })
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from,
    } as never)
    vi.mocked(createServiceClient).mockResolvedValue({ from } as never)

    const { POST } = await import('@/app/api/invite/send/route')
    const res = await POST(makeRequest({ event_id: 'event-id', invite_method: 'email', contact_value: 'guest@test.com' }))

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already been invited/i)
  })
})

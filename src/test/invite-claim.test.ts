import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock state ───────────────────────────────────────────────────────────────

const mockUser = { id: 'guest-id', email: 'guest@test.com' }

let authMock: ReturnType<typeof vi.fn>
let fromMock: ReturnType<typeof vi.fn>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: authMock },
    from: fromMock,
  })),
  createAdminClient: vi.fn(() => ({
    from: fromMock,
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/invite/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/invite/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    authMock = vi.fn().mockResolvedValue({ data: { user: mockUser } })
    fromMock = vi.fn()
  })

  it('returns 401 when not authenticated', async () => {
    authMock = vi.fn().mockResolvedValue({ data: { user: null } })

    const { POST } = await import('@/app/api/invite/claim/route')
    const res = await POST(makeRequest({ invite_id: 'invite-id' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when invite_id is missing', async () => {
    const { POST } = await import('@/app/api/invite/claim/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('successfully claims an unclaimed invite', async () => {
    fromMock.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { event_id: 'event-id' },
        error: null,
      }),
    })

    const { POST } = await import('@/app/api/invite/claim/route')
    const res = await POST(makeRequest({ invite_id: 'invite-id' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.event_id).toBe('event-id')
  })

  it('returns 500 when invite is already claimed or not found', async () => {
    fromMock.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      }),
    })

    const { POST } = await import('@/app/api/invite/claim/route')
    const res = await POST(makeRequest({ invite_id: 'invite-id' }))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('sets user_id and claimed=true on the invite', async () => {
    const updateMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const isMock = vi.fn().mockReturnThis()

    fromMock.mockReturnValue({
      update: updateMock,
      eq: eqMock,
      is: isMock,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { event_id: 'event-id' }, error: null }),
    })

    const { POST } = await import('@/app/api/invite/claim/route')
    await POST(makeRequest({ invite_id: 'invite-id' }))

    expect(updateMock).toHaveBeenCalledWith({ user_id: mockUser.id, claimed: true })
    expect(isMock).toHaveBeenCalledWith('claimed', false) // only claim unclaimed
  })
})

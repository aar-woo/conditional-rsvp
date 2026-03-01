import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClaimInvite } from '@/components/ClaimInvite'
import type { User } from '@supabase/supabase-js'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
    },
    from: vi.fn(() => ({ upsert: mockUpsert })),
  })),
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseInvite = {
  id: 'invite-id',
  event_id: 'event-id',
  token: 'test-token',
  claimed: false,
  events: {
    title: 'Test Party',
    event_date: '2026-03-15T19:00:00Z',
    location: "Aaron's place",
  },
}

const loggedInUser = { id: 'user-id', email: 'user@test.com' } as User

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUpsert.mockResolvedValue({ error: null })

  // Replace global fetch with a mock
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ event_id: 'event-id' }),
  })
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ClaimInvite', () => {
  describe('event preview', () => {
    it('displays the event title', () => {
      render(<ClaimInvite invite={baseInvite} user={null} />)
      expect(screen.getByText('Test Party')).toBeInTheDocument()
    })

    it('displays the event location', () => {
      render(<ClaimInvite invite={baseInvite} user={null} />)
      expect(screen.getByText("Aaron's place")).toBeInTheDocument()
    })

    it('renders gracefully when event details are null', () => {
      render(<ClaimInvite invite={{ ...baseInvite, events: null }} user={null} />)
      expect(screen.getByText('Sign in to join')).toBeInTheDocument()
    })
  })

  describe('logged-in user claim', () => {
    it('shows "Join event" button when user is logged in', () => {
      render(<ClaimInvite invite={baseInvite} user={loggedInUser} />)
      expect(screen.getByRole('button', { name: /join event/i })).toBeInTheDocument()
    })

    it('calls /api/invite/claim and redirects on success', async () => {
      render(<ClaimInvite invite={baseInvite} user={loggedInUser} />)
      await userEvent.click(screen.getByRole('button', { name: /join event/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/events/event-id'), { timeout: 3000 })
      expect(global.fetch).toHaveBeenCalledWith('/api/invite/claim', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ invite_id: 'invite-id' }),
      }))
    })

    it('shows error message when claim fails', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to join event' }),
      })

      render(<ClaimInvite invite={baseInvite} user={loggedInUser} />)
      await userEvent.click(screen.getByRole('button', { name: /join event/i }))

      await waitFor(() => expect(screen.getByText('Failed to join event')).toBeInTheDocument(), { timeout: 3000 })
    })
  })

  describe('login flow', () => {
    it('shows login form by default when no user', () => {
      render(<ClaimInvite invite={baseInvite} user={null} />)
      expect(screen.getByText('Sign in to join')).toBeInTheDocument()
    })

    it('signs in and claims invite on login submit', async () => {
      mockSignIn.mockResolvedValue({ data: { user: loggedInUser }, error: null })

      render(<ClaimInvite invite={baseInvite} user={null} />)
      await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), 'user@test.com')
      await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /sign in & join/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/events/event-id'), { timeout: 3000 })
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' })
      expect(global.fetch).toHaveBeenCalledWith('/api/invite/claim', expect.any(Object))
    })

    it('shows error when login fails', async () => {
      mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid credentials' } })

      render(<ClaimInvite invite={baseInvite} user={null} />)
      await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), 'bad@test.com')
      await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'wrongpass')
      await userEvent.click(screen.getByRole('button', { name: /sign in & join/i }))

      await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument(), { timeout: 3000 })
    })
  })

  describe('signup flow', () => {
    it('switches to signup form when toggled', async () => {
      render(<ClaimInvite invite={baseInvite} user={null} />)
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
      expect(screen.getByText('Create account to join')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/coolperson/i)).toBeInTheDocument()
    })

    it('signs up, upserts profile, and claims invite', async () => {
      mockSignUp.mockResolvedValue({ data: { user: loggedInUser }, error: null })

      render(<ClaimInvite invite={baseInvite} user={null} />)
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
      await userEvent.type(screen.getByPlaceholderText(/coolperson/i), 'newuser')
      await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), 'new@test.com')
      await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /sign up & join/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/events/event-id'), { timeout: 3000 })
      expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@test.com',
        password: 'password123',
        options: { data: { username: 'newuser', display_name: 'newuser' } },
      }))
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: loggedInUser.id, username: 'newuser' }),
        { onConflict: 'id' }
      )
      expect(global.fetch).toHaveBeenCalledWith('/api/invite/claim', expect.any(Object))
    })

    it('shows error when signup fails', async () => {
      mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'Email already registered' } })

      render(<ClaimInvite invite={baseInvite} user={null} />)
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
      await userEvent.type(screen.getByPlaceholderText(/coolperson/i), 'newuser')
      await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), 'taken@test.com')
      await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /sign up & join/i }))

      await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument(), { timeout: 3000 })
    })
  })
})

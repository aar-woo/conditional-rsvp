'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, MapPin, Zap } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface ClaimInviteProps {
  invite: {
    id: string
    event_id: string
    token: string
    claimed: boolean
    events: {
      title: string
      event_date: string
      location: string | null
    } | null
  }
  user: User | null
}

export function ClaimInvite({ invite, user }: ClaimInviteProps) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const event = invite.events

  async function claimInviteForUser() {
    const res = await fetch('/api/invite/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_id: invite.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to join event')
      setLoading(false)
      return
    }
    router.push(`/events/${invite.event_id}`)
    router.refresh()
  }

  async function handleClaim() {
    if (!user) return
    setLoading(true)
    await claimInviteForUser()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setError(error?.message ?? 'Login failed')
      setLoading(false)
      return
    }
    await claimInviteForUser()
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    })

    if (error || !data.user) {
      setError(error?.message ?? 'Signup failed')
      setLoading(false)
      return
    }

    // Explicitly upsert profile in case the DB trigger is delayed
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      display_name: username,
    }, { onConflict: 'id' })

    await claimInviteForUser()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Event preview */}
        {event && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-1">
                <Zap className="h-4 w-4" />
                You&apos;re invited!
              </div>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auth / claim card */}
        <Card>
          <CardHeader>
            <CardTitle>{user ? 'Join this event' : mode === 'login' ? 'Sign in to join' : 'Create account to join'}</CardTitle>
            <CardDescription>
              {user
                ? `Signed in as ${user.email}`
                : 'You need an account to RSVP and track conditions.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <Button className="w-full" onClick={handleClaim} disabled={loading}>
                {loading ? 'Joining…' : 'Join event'}
              </Button>
            ) : (
              <>
                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={username} onChange={e => setUsername(e.target.value)} required placeholder="coolperson" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Loading…' : mode === 'login' ? 'Sign in & join' : 'Sign up & join'}
                  </Button>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  {mode === 'login' ? (
                    <>No account? <button onClick={() => setMode('signup')} className="underline">Sign up</button></>
                  ) : (
                    <>Have an account? <button onClick={() => setMode('login')} className="underline">Sign in</button></>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

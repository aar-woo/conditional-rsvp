'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: event, error: err } = await supabase
      .from('events')
      .insert({
        title: fd.get('title') as string,
        description: fd.get('description') as string || null,
        location: fd.get('location') as string || null,
        event_date: new Date(fd.get('event_date') as string).toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (err || !event) {
      setError(err?.message ?? 'Failed to create event')
      setLoading(false)
      return
    }

    // Also create an invite for the creator so they can see the event
    await supabase.from('invites').insert({
      event_id: event.id,
      user_id: user.id,
      invited_by: user.id,
      invite_method: 'username',
    })

    router.push(`/events/${event.id}`)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Event name *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Weekend hike, dinner at mine, movie night…"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Date & time *</Label>
              <Input
                id="event_date"
                name="event_date"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Address or place name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What's the plan?"
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

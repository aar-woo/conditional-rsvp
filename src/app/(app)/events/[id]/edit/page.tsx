'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Event } from '@/types'

export default function EditEventPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => setEvent(data))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event) return
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const { error: err } = await supabase
      .from('events')
      .update({
        title: fd.get('title') as string,
        description: fd.get('description') as string || null,
        location: fd.get('location') as string || null,
        event_date: new Date(fd.get('event_date') as string).toISOString(),
        status: fd.get('status') as 'active' | 'cancelled',
      })
      .eq('id', event.id)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push(`/events/${event.id}`)
    }
  }

  if (!event) return <div className="animate-pulse h-64 bg-muted rounded-lg" />

  const localDatetime = new Date(event.event_date).toISOString().slice(0, 16)

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/events/${event.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Event name *</Label>
              <Input name="title" defaultValue={event.title} required />
            </div>
            <div className="space-y-2">
              <Label>Date & time *</Label>
              <Input name="event_date" type="datetime-local" defaultValue={localDatetime} required />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input name="location" defaultValue={event.location ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={event.description ?? ''} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={event.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { EventDetailClient } from './EventDetailClient'
import type { Rsvp } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('*, profiles(*)')
    .eq('id', id)
    .single()

  if (!event) notFound()

  // Verify user is invited or is host
  const { data: invite } = await supabase
    .from('invites')
    .select('id')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .single()

  const isHost = event.created_by === user.id
  if (!invite && !isHost) redirect('/dashboard')

  // Fetch current user's RSVP
  const { data: myRsvp } = await supabase
    .from('rsvps')
    .select('*, rsvp_conditions(*)')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
        </Button>
        {isHost && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/events/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <EventDetailClient
        event={event}
        currentUserId={user.id}
        initialRsvp={myRsvp as Rsvp | null}
        isHost={isHost}
      />
    </div>
  )
}

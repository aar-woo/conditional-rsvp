'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ConditionBuilder, type Condition } from '@/components/ConditionBuilder'
import { Check, X, HelpCircle, GitBranch } from 'lucide-react'
import type { Rsvp } from '@/types'

interface RsvpModalProps {
  open: boolean
  onClose: () => void
  eventId: string
  currentRsvp?: Rsvp | null
  onSuccess: () => void
}

type RsvpOption = 'yes' | 'no' | 'maybe' | 'conditional'

const OPTIONS: { value: RsvpOption; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'yes', label: "I'm in", icon: <Check className="h-4 w-4 text-green-600" />, description: 'Confirmed going' },
  { value: 'no', label: "Can't make it", icon: <X className="h-4 w-4 text-red-500" />, description: 'Not attending' },
  { value: 'maybe', label: 'Maybe', icon: <HelpCircle className="h-4 w-4 text-amber-500" />, description: 'Tentative' },
  { value: 'conditional', label: 'Conditional', icon: <GitBranch className="h-4 w-4 text-blue-500" />, description: "I'll go if…" },
]

export function RsvpModal({ open, onClose, eventId, currentRsvp, onSuccess }: RsvpModalProps) {
  const [selected, setSelected] = useState<RsvpOption>(currentRsvp?.response as RsvpOption ?? 'yes')
  const [conditions, setConditions] = useState<Condition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (selected === 'conditional' && conditions.length === 0) {
      setError('Add at least one condition.')
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/rsvps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, response: selected, conditions }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save RSVP')
      setLoading(false)
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your RSVP</DialogTitle>
          <DialogDescription>Choose how you want to respond to this event.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                selected === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {opt.icon}
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>

        {selected === 'conditional' && (
          <div className="border-t pt-4">
            <ConditionBuilder conditions={conditions} onChange={setConditions} />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Saving…' : 'Save RSVP'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

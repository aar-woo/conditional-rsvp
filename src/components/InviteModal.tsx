'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Check, Copy, User, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InviteModalProps {
  open: boolean
  onClose: () => void
  eventId: string
}

type InviteTab = 'username' | 'email' | 'phone'

export function InviteModal({ open, onClose, eventId }: InviteModalProps) {
  const supabase = createClient()
  const [tab, setTab] = useState<InviteTab>('username')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inviteUrl?: string; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSend() {
    setLoading(true)
    setError(null)
    setResult(null)

    let body: Record<string, string> = { event_id: eventId, invite_method: tab }

    if (tab === 'username') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.toLowerCase().trim())
        .single()

      if (!profile) {
        setError(`User "@${value}" not found`)
        setLoading(false)
        return
      }
      body.target_user_id = profile.id
    } else {
      body.contact_value = value.trim()
    }

    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to send invite')
    } else {
      if (tab === 'username') {
        setResult({ message: `Invite sent to @${value}!` })
      } else if (tab === 'email') {
        setResult({ inviteUrl: data.inviteUrl, message: 'Share this link:' })
      } else {
        setResult({ message: `SMS invite sent to ${value}!` })
      }
      setValue('')
    }
    setLoading(false)
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const TABS: { value: InviteTab; label: string; icon: React.ReactNode; placeholder: string }[] = [
    { value: 'username', label: 'Username', icon: <User className="h-4 w-4" />, placeholder: 'Enter username' },
    { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, placeholder: 'Enter email address' },
    { value: 'phone', label: 'Phone', icon: <Phone className="h-4 w-4" />, placeholder: '+1 555 000 0000' },
  ]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>Add people to this event via username, email, or phone.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex rounded-lg border p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setError(null); setResult(null); setValue('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-sm transition-colors ${
                tab === t.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Label>{TABS.find(t => t.value === tab)?.label}</Label>
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={TABS.find(t => t.value === tab)?.placeholder}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend} disabled={loading || !value.trim()}>
              {loading ? '…' : 'Invite'}
            </Button>
          </div>

          {tab === 'phone' && (
            <p className="text-xs text-muted-foreground">
              They&apos;ll receive an SMS with a link to join. Requires Twilio to be configured.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 p-3 space-y-2">
            <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              {result.message}
            </p>
            {result.inviteUrl && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 break-all text-muted-foreground">
                    {result.inviteUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(result.inviteUrl!)}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface Condition {
  condition_type: 'min_attendees' | 'specific_user'
  threshold?: number
  target_user_id?: string
  target_username?: string
}

interface ConditionBuilderProps {
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const supabase = createClient()
  const [condType, setCondType] = useState<'min_attendees' | 'specific_user'>('min_attendees')
  const [threshold, setThreshold] = useState(3)
  const [username, setUsername] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)

  async function addCondition() {
    setSearchError(null)

    if (condType === 'min_attendees') {
      if (threshold < 1) return
      onChange([...conditions, { condition_type: 'min_attendees', threshold }])
    } else {
      if (!username.trim()) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('username', username.trim().toLowerCase())
        .single()

      if (!profile) {
        setSearchError(`User "@${username}" not found`)
        return
      }
      onChange([
        ...conditions,
        {
          condition_type: 'specific_user',
          target_user_id: profile.id,
          target_username: profile.username,
        },
      ])
      setUsername('')
    }
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Existing conditions */}
      {conditions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Your conditions</Label>
          <div className="flex flex-wrap gap-2">
            {conditions.map((c, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
                <span className="text-xs">
                  {c.condition_type === 'min_attendees'
                    ? `≥${c.threshold} people going`
                    : `@${c.target_username} is going`}
                </span>
                <button onClick={() => removeCondition(i)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add condition */}
      <div className="border rounded-lg p-3 space-y-3">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Add condition</Label>
        <Select value={condType} onValueChange={v => setCondType(v as typeof condType)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="min_attendees">At least N people are going</SelectItem>
            <SelectItem value="specific_user">A specific person is going</SelectItem>
          </SelectContent>
        </Select>

        {condType === 'min_attendees' ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">At least</span>
            <Input
              type="number"
              min={1}
              max={999}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-20 h-8 text-sm"
            />
            <span className="text-sm text-muted-foreground">people going</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              placeholder="username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              className="flex-1 h-8 text-sm"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCondition())}
            />
          </div>
        )}

        {searchError && <p className="text-xs text-destructive">{searchError}</p>}

        <Button type="button" size="sm" variant="outline" onClick={addCondition} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add condition
        </Button>
      </div>

      {conditions.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Add at least one condition to submit.
        </p>
      )}
    </div>
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves all conditional RSVPs for a given event.
 * Runs up to MAX_ITERATIONS to handle cascading conditions
 * (e.g. A goes if B goes, B goes if 3+ people go).
 */
export async function resolveConditions(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const MAX_ITERATIONS = 10

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const changed = await runResolutionPass(supabase, eventId)
    if (!changed) break
  }
}

async function runResolutionPass(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  // 1. Fetch all RSVPs for the event
  const { data: rsvps, error: rsvpError } = await supabase
    .from('rsvps')
    .select('id, user_id, response, resolved_response')
    .eq('event_id', eventId)

  if (rsvpError || !rsvps) return false

  // 2. Count current confirmed yeses (non-conditional direct yes + resolved conditional yes)
  const confirmedYesCount = rsvps.filter(
    r => r.resolved_response === 'yes'
  ).length

  // Map user_id → resolved_response for quick lookup
  const userResolved = new Map<string, string>(
    rsvps.map(r => [r.user_id, r.resolved_response])
  )

  // 3. Fetch all conditions for conditional RSVPs in this event
  const conditionalIds = rsvps
    .filter(r => r.response === 'conditional')
    .map(r => r.id)

  if (conditionalIds.length === 0) return false

  const { data: conditions, error: condError } = await supabase
    .from('rsvp_conditions')
    .select('id, rsvp_id, condition_type, threshold, target_user_id, is_met')
    .in('rsvp_id', conditionalIds)

  if (condError || !conditions) return false

  let anyChanged = false

  // 4. Evaluate each condition
  for (const condition of conditions) {
    let nowMet = condition.is_met

    if (condition.condition_type === 'min_attendees') {
      nowMet = confirmedYesCount >= (condition.threshold ?? 0)
    } else if (condition.condition_type === 'specific_user') {
      const targetResolved = condition.target_user_id
        ? userResolved.get(condition.target_user_id)
        : undefined
      nowMet = targetResolved === 'yes'
    }

    if (nowMet !== condition.is_met) {
      await supabase
        .from('rsvp_conditions')
        .update({ is_met: nowMet })
        .eq('id', condition.id)
      condition.is_met = nowMet
      anyChanged = true
    }
  }

  // 5. For each conditional RSVP, check if all its conditions are met
  //    → update resolved_response accordingly
  for (const rsvp of rsvps.filter(r => r.response === 'conditional')) {
    const rsvpConditions = conditions.filter(c => c.rsvp_id === rsvp.id)
    const allMet = rsvpConditions.length > 0 && rsvpConditions.every(c => c.is_met)
    const newResolved = allMet ? 'yes' : 'pending'

    if (newResolved !== rsvp.resolved_response) {
      await supabase
        .from('rsvps')
        .update({ resolved_response: newResolved })
        .eq('id', rsvp.id)
      rsvp.resolved_response = newResolved
      userResolved.set(rsvp.user_id, newResolved)
      anyChanged = true
    }
  }

  return anyChanged
}

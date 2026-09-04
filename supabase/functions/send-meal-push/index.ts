// Send the daily meal-plan web push to every registered device.
//
// Triggered every 15 minutes by the pg_cron job installed via
// supabase/schema.sql; claim_daily_meal_plan() decides inside this function
// whether a send is actually due (timezone-aware, once per day). The Settings
// view's "Send test" button calls the same endpoint with { force: true }.
//
// Required secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  - npx web-push generate-vapid-keys
//   VAPID_SUBJECT                        - contact mailto:, e.g. mailto:you@example.com
//   PUSH_ALLOWED_KEY                     - your publishable key; callers must
//                                          send it as the Authorization bearer
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface PlanMeal {
  name: string
  slot: 'breakfast' | 'lunch' | 'dinner'
  meal_time: string | null
  people: number | null
}

interface ClaimResult {
  send: boolean
  reason?: string
  date?: string
  weekday?: string
  meals?: PlanMeal[]
}

const SLOT_LABELS: Record<PlanMeal['slot'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatTime12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr} ${period}`
}

function detailsLabel(meal: PlanMeal): string | null {
  const parts: string[] = []
  if (meal.meal_time) parts.push(formatTime12(meal.meal_time))
  if (meal.people != null) {
    parts.push(`${meal.people} ${meal.people === 1 ? 'person' : 'people'}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function buildBody(date: string, meals: PlanMeal[]): { title: string; body: string } {
  const [y, m, d] = date.split('-').map(Number)
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekdayLong = weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? ''
  const month = MONTHS[(m ?? 1) - 1] ?? ''
  const title = `Today \u00B7 ${weekdayLong} ${d} ${month}`

  const lines: string[] = []
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    const slotMeals = meals.filter((me) => me.slot === slot)
    if (slotMeals.length === 0) continue
    for (const meal of slotMeals) {
      const details = detailsLabel(meal)
      const suffix = details ? ` (${details})` : ''
      lines.push(`${SLOT_LABELS[slot]}: ${meal.name}${suffix}`)
    }
  }

  return {
    title,
    body: lines.length > 0 ? lines.join('\n') : `No meals planned for ${weekdayLong}.`,
  }
}

function allowed(req: Request): boolean {
  const key = Deno.env.get('PUSH_ALLOWED_KEY')
  if (!key) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${key}` || auth === key
}

Deno.serve(async (req: Request) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type, apikey',
    'access-control-allow-methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }
  if (!allowed(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  let force = false
  try {
    const text = await req.text()
    force = text ? (JSON.parse(text).force === true) : false
  } catch {
    // treat unparseable bodies as a normal (non-forced) trigger
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
    Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const { data: claimed, error: claimError } = await supabase.rpc(
    'claim_daily_meal_plan',
    { p_force: force },
  )
  if (claimError) {
    return new Response(
      JSON.stringify({ error: `claim failed: ${claimError.message}` }),
      { status: 500, headers: { ...cors, 'content-type': 'application/json' } },
    )
  }

  const claim = claimed as ClaimResult
  if (!claim.send) {
    return new Response(JSON.stringify({ sent: 0, skipped: claim.reason }), {
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
  if (subsError) {
    return new Response(
      JSON.stringify({ error: `subscription fetch failed: ${subsError.message}` }),
      { status: 500, headers: { ...cors, 'content-type': 'application/json' } },
    )
  }

  const { title, body } = buildBody(claim.date ?? '', claim.meals ?? [])
  let sent = 0
  const expired: string[] = []

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body }),
        )
        sent += 1
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expired.push(sub.endpoint)
        else console.error('push failed', sub.endpoint, err)
      }
    }),
  )

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return new Response(
    JSON.stringify({ sent, expired: expired.length, title, body }),
    { headers: { ...cors, 'content-type': 'application/json' } },
  )
})

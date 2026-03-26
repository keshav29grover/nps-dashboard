const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars are missing')
  }
}

async function invokeFunction(name, body) {
  assertEnv()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(payload?.error ?? `Failed to call ${name}`)
  }

  return payload
}

export const savePushSubscription = (subscription) =>
  invokeFunction('subscribe-push', { subscription })

export const removePushSubscription = (subscription) =>
  invokeFunction('unsubscribe-push', { endpoint: subscription?.endpoint })

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
}

const projectUrl = Deno.env.get("PROJECT_URL") ?? ""
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? ""
const cronSecret = Deno.env.get("CRON_SECRET") ?? ""

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const vapidEmail = Deno.env.get("VAPID_EMAIL") ?? ""

const supabase = createClient(projectUrl, serviceRoleKey)

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Unauthorized" }, 401)
  }

  if (!projectUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
    return json({ error: "Server secrets are missing" }, 500)
  }

  const body = await req.json().catch(() => ({}))
  const mode = body?.mode === "night" ? "night" : "morning"

  try {
    const latest = await fetchLatestData()
    const subscriptions = await fetchSubscriptions()
    const sendDecision = await shouldSend(mode, latest.lastUpdated)

    if (!sendDecision.shouldSend) {
      return json({
        ok: true,
        mode,
        skipped: true,
        reason: sendDecision.reason,
        lastUpdated: latest.lastUpdated,
      })
    }

    const payload = buildPayload(mode, latest.lastUpdated, latest.hdfcSchemes)
    const result = await sendToAll(subscriptions, payload)

    await recordState(sendDecision.stateKey, sendDecision.stateValue)

    return json({
      ok: true,
      mode,
      sent: result.sent,
      removed: result.removed,
      skipped: false,
      lastUpdated: latest.lastUpdated,
    })
  } catch (error) {
    console.error("send-nav-notifications failed", error)
    return json({ error: "Failed to process notifications" }, 500)
  }
})

async function fetchLatestData() {
  try {
    return await fetchOfficialHdfcLatestData()
  } catch (officialError) {
    console.warn("Official HDFC NAV fetch failed, falling back to npsnav.in", officialError)
    return await fetchNpsNavLatestData()
  }
}

async function fetchOfficialHdfcLatestData() {
  const res = await fetch("https://www.hdfcpension.com/nav/")
  if (!res.ok) throw new Error("Failed to fetch official HDFC NAV page")

  const html = await res.text()
  const parsed = parseOfficialHdfcLatestPage(html)
  return {
    lastUpdated: parsed.lastUpdated,
    hdfcSchemes: parsed.rows,
    source: "hdfcpension.com",
  }
}

async function fetchNpsNavLatestData() {
  const res = await fetch("https://npsnav.in/api/latest")
  if (!res.ok) throw new Error("Failed to fetch latest NAV data")

  const payload = await res.json()
  const lastUpdated = normDate(payload?.metadata?.lastUpdated)
  const rows = Array.isArray(payload?.data) ? payload.data : []
  const hdfcSchemes = rows
    .filter((row) => String(row?.["Scheme Name"] ?? "").toUpperCase().includes("HDFC"))
    .map((row) => ({
      name: row["Scheme Name"],
      nav: parseFloat(row.NAV),
    }))
    .filter((row) => !Number.isNaN(row.nav))

  if (!lastUpdated) throw new Error("Latest NAV metadata is missing lastUpdated")

  return { lastUpdated, hdfcSchemes, source: "npsnav.in" }
}

async function fetchSubscriptions() {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, subscription")

  if (error) throw error
  return data ?? []
}

async function shouldSend(mode: "morning" | "night", lastUpdated: string) {
  const today = nowInIndia().toISOString().slice(0, 10)

  if (mode === "morning") {
    const stateValue = today
    const current = await getState("last_morning_notified_date")

    if (current === stateValue) {
      return { shouldSend: false, reason: "Morning notification already sent today" }
    }

    return {
      shouldSend: true,
      stateKey: "last_morning_notified_date",
      stateValue,
    }
  }

  if (lastUpdated !== today) {
    return { shouldSend: false, reason: "Latest NAV date has not reached today yet" }
  }

  const current = await getState("last_night_notified_date")

  if (current === lastUpdated) {
    return { shouldSend: false, reason: "Night notification already sent for this NAV date" }
  }

  return {
    shouldSend: true,
    stateKey: "last_night_notified_date",
    stateValue: lastUpdated,
  }
}

async function getState(key: string) {
  const { data, error } = await supabase
    .from("notification_state")
    .select("value")
    .eq("key", key)
    .single()

  if (error) throw error
  return data?.value ?? null
}

async function recordState(key: string, value: string) {
  const { error } = await supabase
    .from("notification_state")
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" })

  if (error) throw error
}

function buildPayload(mode: "morning" | "night", lastUpdated: string, schemes: Array<{ name: string, nav: number }>) {
  const dateLabel = formatDate(lastUpdated)
  const body = schemes.length
    ? schemes
        .slice(0, 4)
        .map((scheme) => `${scheme.name.replace("HDFC PENSION MANAGEMENT - ", "")}: Rs ${scheme.nav.toFixed(4)}`)
        .join("\n")
    : `Latest NAV available as of ${dateLabel}`

  return JSON.stringify({
    title: mode === "morning" ? `Morning NAV Update - ${dateLabel}` : `HDFC NAV Published - ${dateLabel}`,
    body,
    url: "/",
  })
}

function parseOfficialHdfcLatestPage(html: string) {
  const dateMatch = html.match(/NAV\s*(?:as on|As on)\s*<\/?[^>]*>\s*(\d{2}-\d{2}-\d{4})/i)
    ?? html.match(/NAV\s*(?:as on|As on)\s*(\d{2}-\d{2}-\d{4})/i)

  const lastUpdated = normDate(dateMatch?.[1] ?? "")
  if (!lastUpdated) {
    throw new Error("Could not parse official HDFC NAV date")
  }

  const rows = []
  const rowRegex = /HDFC[^<\n]*?(?:Tier\s*I|Tier\s*II|Vatsalya Scheme|NPS Lite Scheme)[^<\n]*?(?:<\/t[dh]>\s*<t[dh][^>]*>|<\/[^>]+>\s*<[^>]+>|[\|\u00a0 ]+)(\d+\.\d{1,4})/gi

  for (const match of html.matchAll(rowRegex)) {
    const name = match[0]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/(\d+\.\d{1,4}).*$/g, "")
      .trim()
    const nav = parseFloat(match[1])

    if (!name || isNaN(nav)) continue
    rows.push({ name, nav })
  }

  const deduped = Array.from(new Map(rows.map((row) => [row.name.toUpperCase(), row])).values())
  if (!deduped.length) {
    throw new Error("Could not parse official HDFC NAV rows")
  }

  return { lastUpdated, rows: deduped }
}

async function sendToAll(subscriptions: Array<{ id: string, endpoint: string, subscription: Record<string, unknown> }>, payload: string) {
  let sent = 0
  let removed = 0

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload)
      sent += 1
    } catch (error) {
      const statusCode = error?.statusCode ?? error?.status
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint)
        removed += 1
        continue
      }
      console.error("Failed to send notification", row.endpoint, error)
    }
  }

  return { sent, removed }
}

function nowInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === "year")?.value ?? "1970"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`)
}

function normDate(value = "") {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parts = value.split("-")
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
  }

  return value
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`)
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

// scripts/sendNAVAlert.js
// Runs at 11:15 PM IST via GitHub Actions
// Fetches latest HDFC NAV and sends Web Push notification

import axios from 'axios'
import webpush from 'web-push'

// ── Config from GitHub Secrets ────────────────────────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const PUSH_SUBSCRIPTION = JSON.parse(process.env.PUSH_SUBSCRIPTION)

// ── Fetch HDFC schemes ────────────────────────────────────────────────────────
async function fetchHDFCSchemes() {
  const res  = await axios.get('https://npsnav.in/api/schemes')
  const rows = res.data?.data ?? []
  return rows
    .map(([code, name]) => ({ code, name }))
    .filter(s => s.name.toUpperCase().includes('HDFC'))
}

async function fetchNAV(code) {
  const res = await axios.get(`https://npsnav.in/api/${code}`)
  return parseFloat(res.data)
}

// ── Build notification payload ────────────────────────────────────────────────
function buildPayload(schemes, date) {
  const lines = schemes
    .map(s => `${s.name.replace('HDFC PENSION MANAGEMENT - ', '')}: ₹${s.nav.toFixed(4)}`)
    .join('\n')

  return JSON.stringify({
    title: `HDFC NAV — ${date}`,
    body:  lines,
    url:   '/',
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })

  console.log(`Fetching HDFC NAVs for ${today}...`)

  const schemes = await fetchHDFCSchemes()
  const withNAV = await Promise.all(
    schemes.map(async s => ({ ...s, nav: await fetchNAV(s.code) }))
  )

  const payload = buildPayload(withNAV, today)
  console.log('Sending push notification...')

  await webpush.sendNotification(PUSH_SUBSCRIPTION, payload)
  console.log('✓ Push notification sent!')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
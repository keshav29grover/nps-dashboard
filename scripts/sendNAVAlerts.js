// scripts/sendNAVAlert.js
// Run manually:  node scripts/sendNAVAlert.js
// Run via cron:  GitHub Actions calls this every day at 9 AM IST

import axios from 'axios'

const CONFIG = {
  phone:  process.env.WA_PHONE,   // e.g. 919876543210
  apiKey: process.env.WA_APIKEY,  // from callmebot
  pfm:    'HDFC',
}

// ── 1. Fetch all scheme codes ─────────────────────────────────────────────────
async function fetchHDFCSchemes() {
  const res  = await axios.get('https://npsnav.in/api/schemes')
  const rows = res.data?.data ?? []

  return rows
    .map(([code, name]) => ({ code, name }))
    .filter(s => s.name.toUpperCase().includes(CONFIG.pfm))
}

// ── 2. Fetch NAV for one scheme ───────────────────────────────────────────────
async function fetchNAV(code) {
  const res = await axios.get(`https://npsnav.in/api/${code}`)
  return parseFloat(res.data)
}

// ── 3. Build WhatsApp message ─────────────────────────────────────────────────
function buildMessage(schemes, date) {
  const header = `*NPS HDFC NAV Update — ${date}*\n\n`

  const lines = schemes
    .map(s => `• ${s.name}\n  NAV: *₹${s.nav.toFixed(4)}*`)
    .join('\n\n')

  return header + lines
}

// ── 4. Send via Callmebot ─────────────────────────────────────────────────────
async function sendWhatsApp(message) {
  const encoded = encodeURIComponent(message)
  const url = `https://api.callmebot.com/whatsapp.php?phone=${CONFIG.phone}&text=${encoded}&apikey=${CONFIG.apiKey}`
  const res = await axios.get(url)
  console.log('WhatsApp response:', res.data)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
  })

  console.log(`Fetching HDFC NAVs for ${today}...`)

  const schemes = await fetchHDFCSchemes()
  console.log(`Found ${schemes.length} HDFC schemes`)

  // Fetch all NAVs in parallel
  const withNAV = await Promise.all(
    schemes.map(async s => ({
      ...s,
      nav: await fetchNAV(s.code)
    }))
  )

  const message = buildMessage(withNAV, today)
  console.log('\nMessage preview:\n', message)

  await sendWhatsApp(message)
  console.log('✓ WhatsApp alert sent!')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
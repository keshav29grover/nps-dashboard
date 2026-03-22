import axios from 'axios'

// Proxied via vite.config.js (dev) or vercel.json rewrites (prod)
// /api/nps  →  https://npsnav.in

const nps = axios.create({ baseURL: '/api/nps' })

// ── Correct npsnav.in endpoints ───────────────────────────────────────────────

/**
 * All 151 NPS scheme codes + names.
 * Endpoint: GET /api/schemes
 * Returns: { data: [["SM001001", "SBI PENSION FUND SCHEME - CENTRAL GOVT"], ...], metadata: {...} }
 */
export const fetchSchemeList = () =>
  nps.get('/api/schemes').then((r) => {
    const rows = r.data?.data ?? []
    return rows.map(([code, name]) => ({
      'Scheme Code': code,
      'Scheme Name': name,
      'PFM Name':    derivePFM(name),
    }))
  })

/**
 * Single scheme NAV — plain text number.
 * Endpoint: GET /api/{schemeCode}
 * e.g. /api/SM001001  →  "46.7686"
 */
export const fetchSingleNAV = (schemeCode) =>
  nps.get(`/api/${schemeCode}`).then((r) => parseFloat(r.data))

/**
 * Historical daily NAV for a scheme.
 * Endpoint: GET /api/historical/{schemeCode}
 * Returns: { data: [{ date: "19-05-2025", nav: 28.3 }, ...], metadata: {...} }
 */
export const fetchNAVHistory = (schemeCode) =>
  nps.get(`/api/historical/${schemeCode}`).then((r) => {
    const rows = r.data?.data ?? []
    return rows
      .map((d) => ({
        date: normDate(d.date),
        nav:  parseFloat(d.nav),
      }))
      .filter((d) => d.date && !isNaN(d.nav))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
  })

// ── PFM filter — change this to show a different fund manager ─────────────────
// Set to null to show all fund managers.
const PFM_FILTER = 'HDFC'

/**
 * Fetch scheme NAVs — filtered to PFM_FILTER if set.
 */
export const fetchAllNAVs = async () => {
  const allSchemes = await fetchSchemeList()

  const schemes = PFM_FILTER
    ? allSchemes.filter(s => s['PFM Name'].toUpperCase().includes(PFM_FILTER.toUpperCase()))
    : allSchemes

  const results = await Promise.allSettled(
    schemes.map(async (s) => {
      const nav = await fetchSingleNAV(s['Scheme Code'])
      return { ...s, NAV: nav, 'Last Updated': new Date().toLocaleDateString('en-IN') }
    })
  )

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normDate(str = '') {
  if (!str) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const parts = str.split('-')
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  }
  return str
}

function derivePFM(schemeName = '') {
  const known = [
    'SBI PENSION FUND',
    'LIC PENSION FUND',
    'UTI RETIREMENT SOLUTIONS',
    'HDFC PENSION MANAGEMENT',
    'ICICI PRU PENSION FUND',
    'KOTAK MAHINDRA PENSION FUND',
    'ADITYA BIRLA SUN LIFE PENSION',
    'TATA PENSION MANAGEMENT',
    'MAX LIFE PENSION FUND',
    'AXIS PENSION FUND',
  ]
  const upper = schemeName.toUpperCase()
  return known.find((p) => upper.startsWith(p)) ?? schemeName.split('SCHEME')[0].trim()
}
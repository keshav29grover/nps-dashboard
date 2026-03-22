import axios from 'axios'

// /proxy/nps  →  https://npsnav.in  (both dev and prod)
const nps = axios.create({ baseURL: '/proxy/nps' })

export const fetchSchemeList = () =>
  nps.get('/api/schemes').then((r) => {
    const rows = r.data?.data ?? []
    return rows.map(([code, name]) => ({
      'Scheme Code': code,
      'Scheme Name': name,
      'PFM Name':    derivePFM(name),
    }))
  })

export const fetchSingleNAV = (schemeCode) =>
  nps.get(`/api/${schemeCode}`).then((r) => parseFloat(r.data))

export const fetchNAVHistory = (schemeCode) =>
  nps.get(`/api/historical/${schemeCode}`).then((r) => {
    const rows = r.data?.data ?? []
    return rows
      .map((d) => ({ date: normDate(d.date), nav: parseFloat(d.nav) }))
      .filter((d) => d.date && !isNaN(d.nav))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
  })

// Set to null to show all fund managers
const PFM_FILTER = 'HDFC'

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
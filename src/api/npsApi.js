import axios from 'axios'

const nps = axios.create({ baseURL: '/proxy/nps' })
const hdfc = axios.create({ baseURL: '/proxy/hdfc' })

export const fetchSchemeList = () =>
  nps.get('/api/schemes').then((r) => {
    const rows = r.data?.data ?? []
    return rows.map(([code, name]) => ({
      'Scheme Code': code,
      'Scheme Name': name,
      'PFM Name': derivePFM(name),
    }))
  })

export const fetchSingleNAV = (schemeCode) =>
  nps.get(`/api/${schemeCode}`).then((r) => parseFloat(r.data))

export const fetchLatestNAVs = () =>
  nps.get('/api/latest').then((r) => {
    const rows = r.data?.data ?? []
    const metadata = {
      ...r.data?.metadata,
      lastUpdated: normDate(r.data?.metadata?.lastUpdated),
      source: 'npsnav.in',
    }

    return {
      data: rows.map((row) => ({
        ...row,
        NAV: parseFloat(row.NAV),
        'PFM Name': row['PFM Name'] ?? derivePFM(row['Scheme Name']),
        'Last Updated': normDate(row['Last Updated'] ?? metadata.lastUpdated),
        Source: metadata.source,
      })),
      metadata,
    }
  })

export const fetchOfficialHdfcLatestNAVs = async () => {
  const [schemeList, html] = await Promise.all([
    fetchSchemeList(),
    hdfc.get('/nav/').then((r) => r.data),
  ])

  const parsed = parseOfficialHdfcLatestPage(html)
  const hdfcSchemes = schemeList.filter((scheme) =>
    scheme['PFM Name']?.toUpperCase().includes('HDFC'),
  )

  const byKey = new Map(
    hdfcSchemes.map((scheme) => [schemeKey(scheme['Scheme Name']), scheme]),
  )

  const data = parsed.rows
    .map((row) => {
      const match = byKey.get(schemeKey(row['Scheme Name']))
      if (!match) return null

      return {
        ...match,
        NAV: row.NAV,
        'Last Updated': parsed.lastUpdated,
        Source: 'hdfcpension.com',
      }
    })
    .filter(Boolean)

  if (!data.length) {
    throw new Error('Failed to match HDFC official NAV rows to scheme list')
  }

  return {
    data,
    metadata: {
      lastUpdated: parsed.lastUpdated,
      source: 'hdfcpension.com',
    },
  }
}

export const fetchNAVHistory = (schemeCode) =>
  nps.get(`/api/historical/${schemeCode}`).then((r) => {
    const rows = r.data?.data ?? []
    return rows
      .map((d) => ({ date: normDate(d.date), nav: parseFloat(d.nav) }))
      .filter((d) => d.date && !isNaN(d.nav))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
  })

const PFM_FILTER = 'HDFC'

export const fetchAllNAVs = async () => {
  try {
    const { data, metadata } = await fetchOfficialHdfcLatestNAVs()
    return {
      data: applyPFMFilter(data),
      metadata,
    }
  } catch (error) {
    console.warn('[NAV] Falling back to npsnav.in latest API', error)
    const { data, metadata } = await fetchLatestNAVs()
    return {
      data: applyPFMFilter(data),
      metadata,
    }
  }
}

function applyPFMFilter(data) {
  return PFM_FILTER
    ? data.filter((s) => s['PFM Name']?.toUpperCase().includes(PFM_FILTER.toUpperCase()))
    : data
}

function parseOfficialHdfcLatestPage(html = '') {
  const dateMatch = html.match(/NAV\s*(?:as on|As on)\s*<\/?[^>]*>\s*(\d{2}-\d{2}-\d{4})/i)
    ?? html.match(/NAV\s*(?:as on|As on)\s*(\d{2}-\d{2}-\d{4})/i)

  const lastUpdated = normDate(dateMatch?.[1] ?? '')
  if (!lastUpdated) {
    throw new Error('Could not parse official HDFC NAV date')
  }

  const rows = []
  const rowRegex = /HDFC[^<\n]*?(?:Tier\s*I|Tier\s*II|Vatsalya Scheme|NPS Lite Scheme)[^<\n]*?(?:<\/t[dh]>\s*<t[dh][^>]*>|<\/[^>]+>\s*<[^>]+>|[\|\u00a0 ]+)(\d+\.\d{1,4})/gi

  for (const match of html.matchAll(rowRegex)) {
    const full = match[0]
    const name = full
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/(\d+\.\d{1,4}).*$/g, '')
      .trim()
    const nav = parseFloat(match[1])

    if (!name || isNaN(nav)) continue
    rows.push({ 'Scheme Name': name, NAV: nav })
  }

  const deduped = Array.from(
    new Map(rows.map((row) => [schemeKey(row['Scheme Name']), row])).values(),
  )

  if (!deduped.length) {
    throw new Error('Could not parse official HDFC NAV rows')
  }

  return { lastUpdated, rows: deduped }
}

function normDate(str = '') {
  if (!str) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const parts = str.split('-')
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return str
}

function schemeKey(name = '') {
  return name
    .toUpperCase()
    .replace(/PENSION MANAGEMENT/g, 'PENSION')
    .replace(/FUND MANAGEMENT/g, 'FUND')
    .replace(/NATIONAL PENSION SYSTEM/g, 'NPS')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\bTIER\s*I\b/g, 'TIER1')
    .replace(/\bTIER\s*II\b/g, 'TIER2')
    .replace(/\s+/g, ' ')
    .trim()
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

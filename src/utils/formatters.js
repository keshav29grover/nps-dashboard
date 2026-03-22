import dayjs from 'dayjs'

/**
 * Format a NAV number to Indian Rupee display.
 * formatNAV(46.7686)     →  "₹46.7686"
 * formatNAV(46.7686, 2)  →  "₹46.77"
 */
export const formatNAV = (value, decimals = 4) => {
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return `₹${n.toFixed(decimals)}`
}

/**
 * Format a large NAV number with Indian comma grouping.
 * formatINR(1234567.89)  →  "₹12,34,567.89"
 */
export const formatINR = (value, decimals = 2) => {
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return n.toLocaleString('en-IN', {
    style:                 'currency',
    currency:              'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a date string for display.
 * formatDate("2024-01-15")              →  "15 Jan 2024"
 * formatDate("2024-01-15", "DD/MM/YY")  →  "15/01/24"
 */
export const formatDate = (dateStr, fmt = 'DD MMM YYYY') => {
  if (!dateStr) return '—'
  const d = dayjs(dateStr)
  return d.isValid() ? d.format(fmt) : dateStr
}

/**
 * Format a date as relative time.
 * formatRelative("2024-01-15")  →  "3 months ago"
 */
export const formatRelative = (dateStr) => {
  if (!dateStr) return '—'
  const d = dayjs(dateStr)
  if (!d.isValid()) return dateStr
  const diffDays = dayjs().diff(d, 'day')
  if (diffDays === 0)  return 'Today'
  if (diffDays === 1)  return 'Yesterday'
  if (diffDays < 30)   return `${diffDays} days ago`
  if (diffDays < 365)  return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`
}

/**
 * Calculate percentage change between two NAV values.
 * navChange(40, 46)  →  { change: 6, pct: 15, isUp: true }
 */
export const navChange = (from, to) => {
  const f = parseFloat(from)
  const t = parseFloat(to)
  if (isNaN(f) || isNaN(t) || f === 0) return null
  const change = t - f
  const pct    = (change / f) * 100
  return {
    change: parseFloat(change.toFixed(4)),
    pct:    parseFloat(pct.toFixed(2)),
    isUp:   change >= 0,
  }
}

/**
 * Shorten a long PFM name to 2 meaningful words.
 * shortPFM("SBI PENSION FUND MANAGEMENT PRIVATE LIMITED")  →  "SBI"
 */
export const shortPFM = (name = '') =>
  name
    .replace(/PENSION FUND MANAGEMENT PRIVATE LIMITED/gi, '')
    .replace(/PENSION FUND MANAGEMENT/gi, '')
    .replace(/PENSION FUND/gi, '')
    .replace(/PRIVATE LIMITED/gi, '')
    .replace(/LTD\.?/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')

/**
 * Detect scheme asset class from name.
 * Returns 'E' | 'C' | 'G' | 'A' | null
 */
export const detectSchemeType = (schemeName = '') => {
  const n = schemeName.toUpperCase()
  if (n.includes('EQUITY') || n.includes('SCHEME E')) return 'E'
  if (n.includes('CORP')   || n.includes('SCHEME C')) return 'C'
  if (n.includes('GOVT')   || n.includes('SCHEME G')) return 'G'
  if (n.includes('ALTERN') || n.includes('SCHEME A')) return 'A'
  return null
}
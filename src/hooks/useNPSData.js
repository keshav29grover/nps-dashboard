import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAllNAVs } from '../api/npsApi'

// Auto-refresh interval in milliseconds (5 minutes)
const AUTO_REFRESH_MS = 5 * 60 * 1000

export function useNPSData({ autoRefresh = false } = {}) {
  const [data,        setData]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  // ── Core fetch ───────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)

    try {
      const { data: navs, metadata } = await fetchAllNAVs()
      setData(navs)
      setLastUpdated(metadata?.lastUpdated ?? null)
    } catch (e) {
      setError(e.message ?? 'Failed to fetch NAV data')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    load()
  }, [load])

  // ── Auto-refresh ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return
    timerRef.current = setInterval(() => load(true), AUTO_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, load])

  // ── Derived: group by PFM ────────────────────────────────────────────────────
  // { "SBI PENSION FUND": [scheme, ...], ... }
  const byPFM = data.reduce((acc, s) => {
    const key = s['PFM Name'] ?? 'Unknown'
    acc[key]  = acc[key] || []
    acc[key].push(s)
    return acc
  }, {})

  // ── Derived: scheme types ────────────────────────────────────────────────────
  const schemeTypes = {
    equity: data.filter((s) => /EQUITY|SCHEME E/i.test(s['Scheme Name'])),
    govt:   data.filter((s) => /GOVT|SCHEME G/i.test(s['Scheme Name'])),
    corp:   data.filter((s) => /CORP|SCHEME C/i.test(s['Scheme Name'])),
    alt:    data.filter((s) => /ALTERN|SCHEME A/i.test(s['Scheme Name'])),
  }

  // ── Derived: summary stats ───────────────────────────────────────────────────
  const stats = (() => {
    if (!data.length) return null
    const navs    = data.map((d) => parseFloat(d.NAV)).filter((n) => !isNaN(n))
    const avgNAV  = navs.reduce((a, b) => a + b, 0) / navs.length
    const maxNAV  = Math.max(...navs)
    const minNAV  = Math.min(...navs)
    const topScheme = data.find((d) => parseFloat(d.NAV) === maxNAV)
    return {
      total:      data.length,
      pfmCount:   Object.keys(byPFM).length,
      avgNAV:     avgNAV.toFixed(2),
      maxNAV:     maxNAV.toFixed(4),
      minNAV:     minNAV.toFixed(4),
      topScheme,
    }
  })()

  return {
    data,
    loading,
    error,
    lastUpdated,
    byPFM,
    schemeTypes,
    stats,
    refresh: () => load(false),
  }
}

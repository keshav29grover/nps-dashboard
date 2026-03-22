import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { fetchSchemeList, fetchNAVHistory } from '../api/npsApi'
import dayjs from 'dayjs'

// ── Colour palette for comparison lines ───────────────────────────────────────
const LINE_COLORS = ['#22c77b', '#4d9fff', '#f5a623', '#e879f9', '#ff4d6a', '#a78bfa']

const RANGES = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, 'All': null }

// ── Merge histories by date ───────────────────────────────────────────────────
function mergeHistories(seriesList) {
  const map = {}
  seriesList.forEach(({ code, history }) => {
    history.forEach(({ date, nav }) => {
      if (!map[date]) map[date] = { date }
      map[date][code] = nav
    })
  })
  return Object.values(map).sort((a, b) => (a.date > b.date ? 1 : -1))
}

// ── Filter merged data by range ───────────────────────────────────────────────
function filterByRange(merged, range) {
  const months = RANGES[range]
  if (!months) return merged
  const cutoff = dayjs().subtract(months, 'month').format('YYYY-MM-DD')
  return merged.filter(d => d.date >= cutoff)
}

// ── Normalise to base 100 so different NAV scales are comparable ──────────────
function normalise(data, codes) {
  if (!data.length) return data
  const base = {}
  // find first row that has all codes
  for (const row of data) {
    const hasAll = codes.every(c => row[c] !== undefined)
    if (hasAll) { codes.forEach(c => { base[c] = row[c] }); break }
  }
  if (!Object.keys(base).length) return data
  return data.map(row => {
    const out = { date: row.date }
    codes.forEach(c => {
      if (row[c] !== undefined && base[c])
        out[c] = parseFloat(((row[c] / base[c]) * 100).toFixed(2))
    })
    return out
  })
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, isNorm }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 160 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 10 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{isNorm ? `${p.value}` : `₹${p.value?.toFixed(4)}`}</span>
        </div>
      ))}
    </div>
  )
}

// ── Scheme search dropdown ────────────────────────────────────────────────────
function SchemeSearch({ allSchemes, selected, onAdd, placeholder }) {
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const ref = useRef()

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const results = query.trim().length > 1
    ? allSchemes
        .filter(s => !selected.includes(s['Scheme Code']))
        .filter(s => s['Scheme Name'].toLowerCase().includes(query.toLowerCase()) ||
                     s['PFM Name'].toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : []

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        placeholder={placeholder}
        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none', transition: 'border-color 0.2s' }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent-glow)'; setOpen(true) }}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, marginTop: 4, zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 24px #00000044' }}>
          {results.map(s => (
            <div
              key={s['Scheme Code']}
              onMouseDown={() => { onAdd(s); setQuery(''); setOpen(false) }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>{s['Scheme Name']}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s['PFM Name']}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ComparisonPage({ isMobile }) {
  const [allSchemes,   setAllSchemes]   = useState([])
  const [loadingList,  setLoadingList]  = useState(true)
  const [series,       setSeries]       = useState([])   // [{ code, name, pfm, history, loading }]
  const [range,        setRange]        = useState('1Y')
  const [isNorm,       setIsNorm]       = useState(false)

  // Load full scheme list (all PFMs) on mount
  useEffect(() => {
    fetchSchemeList()
      .then(list => { setAllSchemes(list); setLoadingList(false) })
      .catch(() => setLoadingList(false))
  }, [])

  const addScheme = async (scheme) => {
    const code = scheme['Scheme Code']
    if (series.find(s => s.code === code)) return
    if (series.length >= 6) return   // max 6 lines

    setSeries(prev => [...prev, { code, name: scheme['Scheme Name'], pfm: scheme['PFM Name'], history: [], loading: true }])

    try {
      const history = await fetchNAVHistory(code)
      setSeries(prev => prev.map(s => s.code === code ? { ...s, history, loading: false } : s))
    } catch {
      setSeries(prev => prev.filter(s => s.code !== code))
    }
  }

  const removeScheme = (code) => setSeries(prev => prev.filter(s => s.code !== code))

  // Merge + filter chart data
  const codes    = series.filter(s => !s.loading).map(s => s.code)
  const merged   = mergeHistories(series.filter(s => !s.loading).map(s => ({ code: s.code, history: s.history })))
  const filtered = filterByRange(merged, range)
  const chartData = isNorm ? normalise(filtered, codes) : filtered

  const btnStyle = (active) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 10,
    fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-glow)' : 'var(--border)'}`,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
  })

  const toggleStyle = (active) => ({
    ...btnStyle(active),
    padding: '5px 10px',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? '16px' : '20px 24px' }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>SCHEME COMPARISON</div>
        <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Compare NAV Performance</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Search and add any NPS scheme from any fund manager to compare against HDFC.</div>
      </div>

      {/* Search box */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? '16px' : '20px 24px' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>ADD SCHEMES TO COMPARE</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <SchemeSearch
            allSchemes={allSchemes}
            selected={series.map(s => s.code)}
            onAdd={addScheme}
            placeholder={loadingList ? 'Loading schemes...' : 'Search any scheme (e.g. SBI Equity, LIC Govt...)'}
          />
          {series.length < 6 && (
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              {series.length}/6 added
            </div>
          )}
        </div>

        {/* Selected scheme pills */}
        {series.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {series.map((s, i) => (
              <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-elevated)', border: `1px solid ${LINE_COLORS[i % LINE_COLORS.length]}44`, borderRadius: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: LINE_COLORS[i % LINE_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-primary)', maxWidth: isMobile ? 140 : 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                {s.loading && (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>loading...</span>
                )}
                <button
                  onClick={() => removeScheme(s.code)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {series.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', border: '1px dashed var(--border)', borderRadius: 8 }}>
            Search and add at least 2 schemes to start comparing
          </div>
        )}
      </div>

      {/* Chart */}
      {series.some(s => !s.loading && s.history.length > 0) && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? '16px' : '20px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

          {/* Chart controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.keys(RANGES).map(r => (
                <button key={r} style={btnStyle(range === r)} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>MODE:</span>
              <button style={toggleStyle(!isNorm)} onClick={() => setIsNorm(false)}>₹ NAV</button>
              <button style={toggleStyle(isNorm)}  onClick={() => setIsNorm(true)}>INDEXED</button>
            </div>
          </div>

          {isNorm && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
              INDEXED mode: all schemes start at 100 — shows relative performance regardless of NAV price
            </div>
          )}

          <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={d => dayjs(d).format(RANGES[range] <= 3 ? 'DD MMM' : 'MMM YY')}
                tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                axisLine={false} tickLine={false} interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={v => isNorm ? `${v}` : `₹${v?.toFixed(0)}`}
                tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                axisLine={false} tickLine={false} width={isNorm ? 36 : 56} domain={['auto','auto']}
              />
              <Tooltip content={<CustomTooltip isNorm={isNorm} />} />
              <Legend
                formatter={(value) => {
                  const s = series.find(x => x.code === value)
                  if (!s) return value
                  const short = s.name.length > (isMobile ? 28 : 48) ? s.name.slice(0, isMobile ? 28 : 48) + '…' : s.name
                  return <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{short}</span>
                }}
                wrapperStyle={{ paddingTop: 16 }}
              />
              {codes.map((code, i) => (
                <Line
                  key={code}
                  type="monotone"
                  dataKey={code}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats table — shown when 2+ schemes loaded */}
      {series.filter(s => !s.loading && s.history.length > 0).length >= 2 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
            PERFORMANCE SUMMARY — {range} PERIOD
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Scheme', 'PFM', 'Current NAV', 'Period Start', 'Return %', 'Period High', 'Period Low'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textAlign: h === 'Scheme' || h === 'PFM' ? 'left' : 'right', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.filter(s => !s.loading && s.history.length > 0).map((s, i) => {
                  const periodData = filterByRange(s.history, range)
                  const first  = periodData.at(0)?.nav
                  const last   = periodData.at(-1)?.nav
                  const high   = periodData.length ? Math.max(...periodData.map(d => d.nav)) : null
                  const low    = periodData.length ? Math.min(...periodData.map(d => d.nav)) : null
                  const ret    = first && last ? ((last - first) / first * 100) : null
                  const isPos  = ret >= 0
                  return (
                    <tr key={s.code}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: LINE_COLORS[i % LINE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, maxWidth: isMobile ? 120 : 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {s.pfm.replace(/PENSION FUND MANAGEMENT PRIVATE LIMITED/gi,'').replace(/PENSION FUND/gi,'').trim().split(' ').slice(0,2).join(' ')}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: LINE_COLORS[i % LINE_COLORS.length] }}>
                        {last ? `₹${last.toFixed(4)}` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {first ? `₹${first.toFixed(4)}` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: ret === null ? 'var(--text-muted)' : isPos ? 'var(--accent)' : 'var(--red)' }}>
                        {ret !== null ? `${isPos ? '+' : ''}${ret.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {high ? `₹${high.toFixed(4)}` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
                        {low ? `₹${low.toFixed(4)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
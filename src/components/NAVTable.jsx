import { useState, useMemo } from 'react'
import dayjs from 'dayjs'

const TYPE_META = {
  E: { label: 'EQUITY',  color: 'var(--blue)',   bg: 'var(--blue-dim)' },
  C: { label: 'CORP',    color: 'var(--purple)', bg: '#a78bfa22' },
  G: { label: 'GOVT',    color: 'var(--amber)',  bg: 'var(--amber-dim)' },
  A: { label: 'ALT',     color: 'var(--accent)', bg: 'var(--accent-dim)' },
}

function detectType(name = '') {
  const n = name.toUpperCase()
  if (n.includes('EQUITY') || n.includes('SCHEME E')) return 'E'
  if (n.includes('CORP')   || n.includes('SCHEME C')) return 'C'
  if (n.includes('GOVT')   || n.includes('SCHEME G')) return 'G'
  if (n.includes('ALTERN') || n.includes('SCHEME A')) return 'A'
  return null
}

function TypeBadge({ name }) {
  const key = detectType(name)
  if (!key) return null
  const m = TYPE_META[key]
  return (
    <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 4, background: m.bg, color: m.color, border: `1px solid ${m.color}44`, flexShrink: 0 }}>
      {m.label}
    </span>
  )
}

function shortPFM(name = '') {
  return name.replace(/PENSION FUND MANAGEMENT PRIVATE LIMITED/gi,'').replace(/PENSION FUND MANAGEMENT/gi,'').replace(/PENSION FUND/gi,'').replace(/PRIVATE LIMITED/gi,'').replace(/LTD\.?/gi,'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ')
}

export default function NAVTable({ data, onSelect, isMobile }) {
  const [search,     setSearch]     = useState('')
  const [sortKey,    setSortKey]    = useState('NAV')
  const [sortDir,    setSortDir]    = useState('desc')
  const [typeFilter, setTypeFilter] = useState('All')
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = isMobile ? 10 : 20

  const filtered = useMemo(() => {
    let rows = data
    if (typeFilter !== 'All') rows = rows.filter(d => detectType(d['Scheme Name']) === typeFilter)
    if (search.trim()) rows = rows.filter(d =>
      d['Scheme Name'].toLowerCase().includes(search.toLowerCase()))
    return [...rows].sort((a, b) => {
      const va = sortKey === 'NAV' ? parseFloat(a[sortKey]) : a[sortKey]
      const vb = sortKey === 'NAV' ? parseFloat(b[sortKey]) : b[sortKey]
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
    })
  }, [data, search, sortKey, sortDir, typeFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const inputStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
    fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
    width: '100%', transition: 'border-color 0.2s',
  }

  const filterBtnStyle = (active) => ({
    padding: '6px 10px', borderRadius: 6, fontSize: 9,
    fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-glow)' : 'var(--border)'}`,
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
  })

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Filter bar */}
      <div style={{ padding: isMobile ? '12px' : '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search scheme..."
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent-glow)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {['All','E','C','G','A'].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }} style={filterBtnStyle(typeFilter === t)}>
              {t === 'All' ? 'ALL' : t === 'E' ? 'EQUITY' : t === 'C' ? 'CORP' : t === 'G' ? 'GOVT' : 'ALT'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {filtered.length} schemes
          </span>
        </div>
      </div>

      {/* Mobile card list */}
      {isMobile ? (
        <div>
          {pageRows.map((row) => (
            <div
              key={row['Scheme Code']}
              onClick={() => onSelect?.(row)}
              style={{ padding: '14px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
              onTouchStart={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <TypeBadge name={row['Scheme Name']} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {row['Scheme Name']}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                  ₹{parseFloat(row.NAV).toFixed(4)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                  {row['Last Updated'] || '—'}
                </div>
              </div>
            </div>
          ))}
          {pageRows.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              NO SCHEMES FOUND
            </div>
          )}
        </div>
      ) : (
        /* Desktop table */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[['Scheme Name','Scheme','left'],['PFM Name','Fund Manager','left'],['NAV','NAV (₹)','right'],['Last Updated','Updated','right']].map(([key, label, align]) => (
                  <th key={key} onClick={() => handleSort(key)}
                    style={{ padding: '10px 16px', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.1em', textAlign: align, color: sortKey === key ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                ))}
                <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', width: 30 }} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row['Scheme Code']} onClick={() => onSelect?.(row)}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TypeBadge name={row['Scheme Name']} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{row['Scheme Name']}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {shortPFM(row['PFM Name'])}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      ₹{parseFloat(row.NAV).toFixed(4)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {row['Last Updated'] ? dayjs(row['Last Updated']).isValid() ? dayjs(row['Last Updated']).format('DD MMM YY') : row['Last Updated'] : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>→</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  NO SCHEMES MATCH YOUR FILTERS
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {page}/{totalPages}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              style={{ width: 32, height: 32, borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-mono)', cursor: page===1?'not-allowed':'pointer', background:'transparent', border:'1px solid var(--border)', color: page===1?'var(--text-muted)':'var(--text-secondary)', transition:'all 0.15s' }}>
              ←
            </button>
            {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page-1, totalPages-(isMobile?3:5)+1))
              const pg = start + i
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  style={{ width: 32, height: 32, borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', cursor:'pointer', background: pg===page?'var(--accent-dim)':'transparent', border:`1px solid ${pg===page?'var(--accent-glow)':'var(--border)'}`, color: pg===page?'var(--accent)':'var(--text-secondary)', transition:'all 0.15s' }}>
                  {pg}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              style={{ width: 32, height: 32, borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-mono)', cursor: page===totalPages?'not-allowed':'pointer', background:'transparent', border:'1px solid var(--border)', color: page===totalPages?'var(--text-muted)':'var(--text-secondary)', transition:'all 0.15s' }}>
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
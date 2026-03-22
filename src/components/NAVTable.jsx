import { useState, useMemo } from 'react'
import dayjs from 'dayjs'

const TYPE_META = {
  E: { label: 'EQUITY',   color: 'var(--blue)',   bg: 'var(--blue-dim)' },
  C: { label: 'CORP',     color: 'var(--purple)', bg: '#a78bfa22' },
  G: { label: 'GOVT',     color: 'var(--amber)',  bg: 'var(--amber-dim)' },
  A: { label: 'ALT',      color: 'var(--accent)', bg: 'var(--accent-dim)' },
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
    <span style={{
      fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
      letterSpacing: '0.1em', padding: '2px 7px', borderRadius: 4,
      background: m.bg, color: m.color,
      border: `1px solid ${m.color}44`,
    }}>{m.label}</span>
  )
}

function shortPFM(name = '') {
  return name.replace(/PENSION FUND MANAGEMENT PRIVATE LIMITED/gi,'').replace(/PENSION FUND MANAGEMENT/gi,'').replace(/PENSION FUND/gi,'').replace(/PRIVATE LIMITED/gi,'').replace(/LTD\.?/gi,'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ')
}

export default function NAVTable({ data, onSelect }) {
  const [search,     setSearch]     = useState('')
  const [sortKey,    setSortKey]    = useState('NAV')
  const [sortDir,    setSortDir]    = useState('desc')
  const [pfmFilter,  setPfmFilter]  = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 20

  const pfmOptions = useMemo(() => ['All', ...new Set(data.map(d => d['PFM Name']))].sort(), [data])

  const filtered = useMemo(() => {
    let rows = data
    if (pfmFilter !== 'All') rows = rows.filter(d => d['PFM Name'] === pfmFilter)
    if (typeFilter !== 'All') rows = rows.filter(d => detectType(d['Scheme Name']) === typeFilter)
    if (search.trim()) rows = rows.filter(d =>
      d['Scheme Name'].toLowerCase().includes(search.toLowerCase()) ||
      d['PFM Name'].toLowerCase().includes(search.toLowerCase()))
    return [...rows].sort((a, b) => {
      const va = sortKey === 'NAV' ? parseFloat(a[sortKey]) : a[sortKey]
      const vb = sortKey === 'NAV' ? parseFloat(b[sortKey]) : b[sortKey]
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
    })
  }, [data, search, sortKey, sortDir, pfmFilter, typeFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const inputStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)',
    fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
    transition: 'border-color 0.2s',
  }

  const filterBtnStyle = (active) => ({
    padding: '7px 14px', borderRadius: 6, fontSize: 10,
    fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-glow)' : 'var(--border)'}`,
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
  })

  const colStyle = (key, align = 'left') => ({
    padding: '10px 16px', fontSize: 10, fontFamily: 'var(--font-mono)',
    fontWeight: 600, letterSpacing: '0.1em', textAlign: align,
    color: sortKey === key ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
  })

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Filter bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: 'var(--bg-elevated)' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search scheme or fund manager..."
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-glow)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <select
          value={pfmFilter}
          onChange={e => { setPfmFilter(e.target.value); setPage(1) }}
          style={{ ...inputStyle, maxWidth: 180 }}
        >
          {pfmOptions.map(p => (
            <option key={p} value={p} style={{ background: 'var(--bg-elevated)' }}>
              {p === 'All' ? 'All Managers' : shortPFM(p)}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {['All','E','C','G','A'].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }} style={filterBtnStyle(typeFilter === t)}>
              {t === 'All' ? 'ALL' : t === 'E' ? 'EQUITY' : t === 'C' ? 'CORP' : t === 'G' ? 'GOVT' : 'ALT'}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} SCHEMES
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[['Scheme Name','Scheme','left'],['PFM Name','Fund Manager','left'],['NAV','NAV (₹)','right'],['Last Updated','Updated','right']].map(([key, label, align]) => (
                <th key={key} onClick={() => handleSort(key)} style={colStyle(key, align)}>
                  {label} {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                </th>
              ))}
              <th style={{ ...colStyle('', 'right'), cursor: 'default' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={row['Scheme Code']}
                onClick={() => onSelect?.(row)}
                style={{ cursor: 'pointer', transition: 'background 0.15s', animationDelay: `${i * 0.02}s` }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TypeBadge name={row['Scheme Name']} />
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {row['Scheme Name']}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {shortPFM(row['PFM Name'])}
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    ₹{parseFloat(row.NAV).toFixed(4)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {row['Last Updated'] ? dayjs(row['Last Updated']).isValid() ? dayjs(row['Last Updated']).format('DD MMM YY') : row['Last Updated'] : '—'}
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                  →
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                NO SCHEMES MATCH YOUR FILTERS
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            PAGE {page} / {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['←', ...Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              return start + i
            }), '→'].map((item, idx) => {
              const isArrow = item === '←' || item === '→'
              const pg = item === '←' ? page - 1 : item === '→' ? page + 1 : item
              const disabled = (item === '←' && page === 1) || (item === '→' && page === totalPages)
              const isActive = !isArrow && item === page
              return (
                <button key={idx} onClick={() => !disabled && setPage(pg)} disabled={disabled}
                  style={{
                    width: 32, height: 32, borderRadius: 6, fontSize: 12,
                    fontFamily: 'var(--font-mono)', cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--accent-glow)' : 'var(--border)'}`,
                    color: isActive ? 'var(--accent)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >{item}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
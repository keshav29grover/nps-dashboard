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

function shortPFM(name = '') {
  return name.replace(/PENSION FUND MANAGEMENT PRIVATE LIMITED/gi,'').replace(/PENSION FUND MANAGEMENT/gi,'').replace(/PENSION FUND/gi,'').replace(/PRIVATE LIMITED/gi,'').replace(/LTD\.?/gi,'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ')
}

export default function SchemeCard({ scheme, onClick }) {
  const nav     = parseFloat(scheme.NAV)
  const typeKey = detectType(scheme['Scheme Name'])
  const meta    = typeKey ? TYPE_META[typeKey] : { label: 'NPS', color: 'var(--text-muted)', bg: '#3d516622' }

  return (
    <div
      onClick={() => onClick?.(scheme)}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Corner glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: `radial-gradient(circle at top right, ${meta.color}22, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Badge + PFM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
          {meta.label}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortPFM(scheme['PFM Name'])}
        </span>
      </div>

      {/* Name */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14, minHeight: '3em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {scheme['Scheme Name']}
      </div>

      {/* NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 3 }}>NAV</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: meta.color }}>
            ₹{nav.toFixed(4)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>VIEW →</div>
      </div>

      {scheme['Last Updated'] && (
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 10, opacity: 0.6 }}>
          {scheme['Last Updated']}
        </div>
      )}
    </div>
  )
}
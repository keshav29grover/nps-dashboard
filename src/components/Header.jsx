import dayjs from 'dayjs'

export default function Header({ lastUpdated, onRefresh, loading, theme, onToggleTheme }) {
  const isDark = theme === 'dark'

  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
      transition: 'background 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Top accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s, border-color 0.3s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M17.5 14l3 3-3 3M14 17h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
              NPS<span style={{ color: 'var(--accent)' }}>NAV</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              National Pension System
            </div>
          </div>
        </div>

        {/* Center: live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, transition: 'background 0.3s, border-color 0.3s' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'glow-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>LIVE NAV FEED</span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Timestamp */}
          {lastUpdated && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>LAST UPDATED</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {dayjs(lastUpdated).format('DD MMM YYYY · HH:mm:ss')}
              </div>
            </div>
          )}

          {/* ── Theme toggle ── */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 38, height: 38, borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
          >
            {isDark ? (
              /* Sun icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            ) : (
              /* Moon icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              background: loading ? 'var(--bg-elevated)' : 'var(--accent-dim)',
              border: '1px solid ' + (loading ? 'var(--border)' : 'var(--accent-glow)'),
              color: loading ? 'var(--text-muted)' : 'var(--accent)',
              fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 0.2s',
            }}
          >
            <svg style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.93 15a8 8 0 1 0 .53-5.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {loading ? 'SYNCING...' : 'REFRESH'}
          </button>
        </div>
      </div>
    </header>
  )
}
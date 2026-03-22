import { useState, useEffect } from 'react'
import { useNPSData }    from './hooks/useNPSData'
import Header            from './components/Header'
import StatCard          from './components/StatCard'
import NAVTable          from './components/NAVTable'
import NAVChart          from './components/NAVChart'
import PFMBreakdown      from './components/PFMBreakdown'
import SchemeCard        from './components/SchemeCard'
import { shortPFM }      from './utils/formatters'

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glow-pulse 2s ease-in-out infinite' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>NPS</span>
      </div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>FETCHING LIVE NAV DATA...</div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--red-dim)', border: '1px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--red)', fontSize: 20 }}>!</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Failed to load NAV data</div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 20, wordBreak: 'break-word' }}>{message}</div>
        <button onClick={onRetry} style={{ padding: '10px 24px', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}>
          RETRY
        </button>
      </div>
    </div>
  )
}

const ASSET_TYPES = [
  { key: 'equity', label: 'Equity',    sublabel: 'Scheme E', color: 'var(--blue)',   dim: 'var(--blue-dim)' },
  { key: 'corp',   label: 'Corp Bond', sublabel: 'Scheme C', color: 'var(--purple)', dim: 'var(--purple-dim)' },
  { key: 'govt',   label: 'Govt Bond', sublabel: 'Scheme G', color: 'var(--amber)',  dim: 'var(--amber-dim)' },
  { key: 'alt',    label: 'Alternate', sublabel: 'Scheme A', color: 'var(--pink)',   dim: 'var(--pink-dim)' },
]

// Simple responsive hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

export default function App() {
  const { data, loading, error, lastUpdated, byPFM, schemeTypes, stats, refresh } = useNPSData({ autoRefresh: true })
  const [activeTab,      setActiveTab]      = useState('table')
  const [selectedScheme, setSelectedScheme] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('nps-theme') || 'dark')
  const isMobile = useIsMobile()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('nps-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} onRetry={refresh} />

  const handleSelect = (scheme) => {
    setSelectedScheme(scheme)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tabStyle = (active) => ({
    padding: isMobile ? '7px 14px' : '8px 20px',
    borderRadius: 8, fontSize: isMobile ? 10 : 11,
    fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-glow)' : 'var(--border)'}`,
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', gap: 6, flex: isMobile ? 1 : 'unset',
    justifyContent: isMobile ? 'center' : 'flex-start',
  })

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        loading={loading}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '16px 12px' : '28px 24px', display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 24 }}>

        {/* Stat cards — 2 col on mobile, 4 on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16 }}>
          <StatCard label="Total Schemes" value={stats?.total ?? '—'} accent="var(--accent)" />
          <StatCard label="Fund Managers" value={stats?.pfmCount ?? '—'} accent="var(--blue)" />
          <StatCard label="Average NAV"   value={stats ? `₹${stats.avgNAV}` : '—'} accent="var(--purple)" />
          <StatCard label="Highest NAV"   value={stats ? `₹${stats.maxNAV}` : '—'} sub={stats?.topScheme ? shortPFM(stats.topScheme['PFM Name']) : undefined} accent="var(--amber)" />
        </div>

        {/* Selected scheme chart */}
        {selectedScheme && (
          <NAVChart
            schemeCode={selectedScheme['Scheme Code']}
            schemeName={selectedScheme['Scheme Name']}
            onClose={() => setSelectedScheme(null)}
          />
        )}

        {/* Charts row — stacked on mobile, side-by-side on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 16 }}>
          <PFMBreakdown data={byPFM} />

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? '16px' : '20px 24px', transition: 'background 0.3s, border-color 0.3s' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Portfolio Breakdown</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Schemes by Asset Class</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ASSET_TYPES.map(({ key, label, sublabel, color, dim }) => {
                const schemes = schemeTypes[key] ?? []
                const navs    = schemes.map(s => parseFloat(s.NAV)).filter(n => !isNaN(n))
                const avg     = navs.length ? (navs.reduce((a,b) => a+b,0)/navs.length).toFixed(2) : null
                return (
                  <div key={key} style={{ background: dim, border: `1px solid ${color}33`, borderRadius: 10, padding: '12px 14px', transition: 'background 0.3s' }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color, letterSpacing: '0.1em', marginBottom: 4 }}>{sublabel}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color }}>{schemes.length}</div>
                    {avg && <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>avg ₹{avg}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <button style={tabStyle(activeTab === 'table')} onClick={() => setActiveTab('table')}>
            TABLE
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: activeTab === 'table' ? 'var(--accent-glow)' : 'var(--bg-elevated)', color: activeTab === 'table' ? 'var(--accent)' : 'var(--text-muted)' }}>{data.length}</span>
          </button>
          <button style={tabStyle(activeTab === 'cards')} onClick={() => setActiveTab('cards')}>
            CARDS
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: activeTab === 'cards' ? 'var(--accent-glow)' : 'var(--bg-elevated)', color: activeTab === 'cards' ? 'var(--accent)' : 'var(--text-muted)' }}>{data.length}</span>
          </button>
        </div>

        {activeTab === 'table' && <NAVTable data={data} onSelect={handleSelect} isMobile={isMobile} />}

        {activeTab === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 10 : 16 }}>
            {data.map(scheme => (
              <SchemeCard key={scheme['Scheme Code']} scheme={scheme} onClick={handleSelect} />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
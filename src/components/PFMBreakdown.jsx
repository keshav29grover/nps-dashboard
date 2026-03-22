import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function shortLabel(name = '') {
  return name.replace(/PENSION FUND MANAGEMENT PRIVATE LIMITED/gi,'').replace(/PENSION FUND MANAGEMENT/gi,'').replace(/PENSION FUND/gi,'').replace(/PRIVATE LIMITED/gi,'').replace(/LTD\.?/gi,'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ')
}

const COLORS = ['#00d4aa','#4d9fff','#a78bfa','#f5a623','#ff4d6a','#00d4aa99','#4d9fff99','#a78bfa99']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontSize: 10 }}>{d.fullName}</div>
      <div style={{ color: 'var(--accent)' }}>AVG NAV: ₹{d.avgNAV}</div>
      <div style={{ color: 'var(--text-secondary)' }}>SCHEMES: {d.count}</div>
      <div style={{ color: 'var(--text-muted)' }}>MAX: ₹{d.maxNAV}</div>
    </div>
  )
}

export default function PFMBreakdown({ data }) {
  const chartData = Object.entries(data).map(([pfm, schemes]) => {
    const navs = schemes.map(s => parseFloat(s.NAV)).filter(n => !isNaN(n))
    const avg  = navs.length ? (navs.reduce((a,b) => a+b, 0) / navs.length).toFixed(2) : '0'
    const max  = navs.length ? Math.max(...navs).toFixed(2) : '0'
    return { name: shortLabel(pfm), fullName: pfm, count: schemes.length, avgNAV: avg, maxNAV: max, value: parseFloat(avg) }
  }).sort((a, b) => b.value - a.value)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Fund Manager Performance</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Avg NAV by PFM</div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#3d5166', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} interval={0} />
          <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize: 10, fill: '#3d5166', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e2d3d55' }} />
          <Bar dataKey="value" radius={[4,4,0,0]} maxBarSize={48}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        {chartData.slice(0, 3).map((d, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS[i], fontFamily: 'var(--font-mono)' }}>₹{d.avgNAV}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.count} schemes</div>
          </div>
        ))}
      </div>
    </div>
  )
}
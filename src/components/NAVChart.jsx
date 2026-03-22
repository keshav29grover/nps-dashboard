import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { fetchNAVHistory } from '../api/npsApi'
import dayjs from 'dayjs'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>₹{parseFloat(payload[0].value).toFixed(4)}</div>
    </div>
  )
}

const RANGES = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, 'All': null }

export default function NAVChart({ schemeCode, schemeName, onClose }) {
  const [allData,  setAllData]  = useState([])
  const [range,    setRange]    = useState('6M')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!schemeCode) return
    setLoading(true); setError(null)
    fetchNAVHistory(schemeCode)
      .then(setAllData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [schemeCode])

  const chartData = (() => {
    const months = RANGES[range]
    if (!months) return allData
    const cutoff = dayjs().subtract(months, 'month').format('YYYY-MM-DD')
    return allData.filter(d => d.date >= cutoff)
  })()

  const latest   = chartData.at(-1)?.nav ?? null
  const earliest = chartData.at(0)?.nav  ?? null
  const maxNAV   = chartData.length ? Math.max(...chartData.map(d => d.nav)) : null
  const minNAV   = chartData.length ? Math.min(...chartData.map(d => d.nav)) : null
  const change   = latest && earliest ? latest - earliest : null
  const changePct = change && earliest ? (change / earliest) * 100 : null
  const isUp      = change >= 0

  const tickInterval = (() => {
    const len = chartData.length
    if (len <= 30) return 4; if (len <= 90) return 14
    if (len <= 180) return 20; if (len <= 365) return 30; return 60
  })()

  const btnStyle = (active) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 10,
    fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-glow)' : 'var(--border)'}`,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
  })

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-glow)', borderRadius: 12, padding: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 40px var(--accent-dim)' }}>
      {/* Top glow line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>HISTORICAL NAV</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 500 }}>{schemeName ?? schemeCode}</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Stats row */}
      {!loading && !error && latest && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₹{latest.toFixed(4)}</span>
          {change !== null && (
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: isUp ? 'var(--accent)' : 'var(--red)' }}>
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(4)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
            </span>
          )}
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{range} PERIOD</span>
        </div>
      )}

      {/* Range buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {Object.keys(RANGES).map(r => (
          <button key={r} style={btnStyle(range === r)} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      {/* Chart */}
      {loading && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em' }}>
          LOADING NAV HISTORY...
        </div>
      )}
      {error && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>FAILED TO LOAD HISTORY</div>
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{error}</div>
        </div>
      )}
      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
            <XAxis dataKey="date" tickFormatter={d => dayjs(d).format(RANGES[range] <= 3 ? 'DD MMM' : 'MMM YY')} interval={tickInterval} tick={{ fontSize: 10, fill: '#3d5166', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto','auto']} tickFormatter={v => `₹${v.toFixed(0)}`} tick={{ fontSize: 10, fill: '#3d5166', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<CustomTooltip />} />
            {maxNAV && <ReferenceLine y={maxNAV} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={0.8} label={{ value: 'HIGH', position: 'insideTopRight', fontSize: 9, fill: 'var(--accent)', fontFamily: 'var(--font-mono)' }} />}
            {minNAV && <ReferenceLine y={minNAV} stroke="var(--red)" strokeDasharray="4 4" strokeWidth={0.8} label={{ value: 'LOW', position: 'insideBottomRight', fontSize: 9, fill: 'var(--red)', fontFamily: 'var(--font-mono)' }} />}
            <Line type="monotone" dataKey="nav" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {!loading && !error && chartData.length === 0 && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>NO DATA FOR THIS RANGE</div>
      )}

      {/* Min/max footer */}
      {!loading && !error && maxNAV && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>PERIOD LOW: <span style={{ color: 'var(--red)' }}>₹{minNAV.toFixed(4)}</span></span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>PERIOD HIGH: <span style={{ color: 'var(--accent)' }}>₹{maxNAV.toFixed(4)}</span></span>
        </div>
      )}
    </div>
  )
}
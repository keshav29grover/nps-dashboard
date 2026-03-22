export default function StatCard({ label, value, sub, accent = 'var(--accent)', icon }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fade-up 0.4s ease forwards',
      transition: 'border-color 0.2s, transform 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Corner accent glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Top line accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
      }} />

      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        {label}
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: sub ? 8 : 0 }}>
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
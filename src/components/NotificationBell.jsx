// components/NotificationBell.jsx
// Bell icon in header — click to enable/disable push notifications

import { usePushNotifications } from '../hooks/usePushNotifications'

export default function NotificationBell() {
  const { isSupported, isSubscribed, loading, error, subscribe, unsubscribe, permission } = usePushNotifications()

  if (!isSupported) return null

  const handleClick = () => {
    if (isSubscribed) unsubscribe()
    else subscribe()
  }

  const label = loading
    ? 'Setting up...'
    : isSubscribed
    ? 'Notifications on — click to turn off'
    : permission === 'denied'
    ? 'Notifications blocked in browser settings'
    : 'Enable 11 PM NAV push notifications'

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        disabled={loading || permission === 'denied'}
        title={label}
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: isSubscribed ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          border: `1px solid ${isSubscribed ? 'var(--accent-glow)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loading || permission === 'denied' ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s', flexShrink: 0, opacity: permission === 'denied' ? 0.4 : 1,
        }}
        onMouseEnter={e => { if (!loading && permission !== 'denied') { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}}
        onMouseLeave={e => { e.currentTarget.style.borderColor = isSubscribed ? 'var(--accent-glow)' : 'var(--border)'; e.currentTarget.style.background = isSubscribed ? 'var(--accent-dim)' : 'var(--bg-elevated)' }}
      >
        {loading ? (
          <svg style={{ animation: 'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M4.93 15a8 8 0 1 0 .53-5.36" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : isSubscribed ? (
          // Bell with dot — active
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            <circle cx="18" cy="5" r="3" fill="var(--accent)" stroke="none"/>
          </svg>
        ) : (
          // Bell off — inactive
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        )}
      </button>

      {/* Tooltip on first visit */}
      {!isSubscribed && permission === 'default' && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
          borderRadius: 8, padding: '10px 12px', fontSize: 11,
          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          lineHeight: 1.5, zIndex: 100, pointerEvents: 'none',
          display: 'none',
        }} id="bell-tooltip">
          Get notified at 11 PM when today's NAV is published
        </div>
      )}
    </div>
  )
}
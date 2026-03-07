export default function Logo({
  size = 'md',
  color = 'dark',
}: {
  size?: 'sm' | 'md' | 'lg'
  color?: 'dark' | 'light'
}) {
  const sizes = {
    sm: { icon: 28, font: 13, radius: 6 },
    md: { icon: 38, font: 18, radius: 9 },
    lg: { icon: 48, font: 24, radius: 11 },
  }
  const s = sizes[size]

  const isDark = color === 'dark'
  const textColor = isDark ? '#0d0d0d' : '#ffffff'
  const iconBg = isDark ? '#0d0d0d' : '#ffffff'
  const iconText = isDark ? '#ffffff' : '#0d0d0d'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div
        style={{
          width: s.icon,
          height: s.icon,
          background: iconBg,
          borderRadius: s.radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: s.font - 3,
            fontWeight: 700,
            color: iconText,
            letterSpacing: '-1.5px',
            lineHeight: 1,
          }}
        >
          ~/
        </span>
      </div>
      <span
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: s.font,
          fontWeight: 600,
          letterSpacing: '-0.3px',
          color: textColor,
        }}
      >
        DevArena
      </span>
    </div>
  )
}

import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          ~/
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}

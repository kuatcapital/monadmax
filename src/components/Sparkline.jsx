// Small area chart for the hero cards: a line with a soft gradient fill
// underneath and a dot marking the latest value.

import { useId } from 'react'

export function Sparkline({ values, className = '', color = '#ffffff' }) {
  const gradientId = useId()
  if (!values || values.length < 2) return <div className={className} />

  const W = 300
  const H = 60
  const PAD = 4
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - PAD - ((v - min) / range) * (H - PAD * 2)])
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${H} ${line} ${W},${H}`
  const [lx, ly] = pts[pts.length - 1]

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeOpacity=".9"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {/* Dot drawn in HTML so it stays round when the SVG stretches */}
      <span
        className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full ring-4 ring-white/20"
        style={{ left: `${(lx / W) * 100}%`, top: `${(ly / H) * 100}%`, background: color }}
      />
    </div>
  )
}

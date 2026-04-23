'use client'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

export default function ScoreRing({ score, size = 42, strokeWidth = 3 }: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const center = size / 2

  const color =
    score >= 70 ? '#00C896' :
    score >= 50 ? '#2563EB' :
    score >= 30 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        fill="none" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={center} cy={center} r={radius}
          stroke="var(--border)" strokeWidth={strokeWidth} fill="none" />
        {/* Progress */}
        <circle cx={center} cy={center} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring" />
      </svg>
      {/* Score number — div overlay, never invisible in dark mode */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.26, fontWeight: 700,
        fontFamily: 'monospace', color: color,
      }}>
        {score}
      </div>
    </div>
  )
}
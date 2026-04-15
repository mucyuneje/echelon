
interface ScoreRingProps { score: number; size?: number; strokeWidth?: number; label?: string }

export default function ScoreRing({ score, size = 80, strokeWidth = 6, label }: ScoreRingProps) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#00C896' : score >= 50 ? '#F5A623' : '#E53E3E'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: 'white', fontSize: size * 0.22, fontWeight: 600, fontFamily: 'DM Sans' }}>
          {score}
        </text>
      </svg>
      {label && <span className="text-white/40 text-xs">{label}</span>}
    </div>
  )
}

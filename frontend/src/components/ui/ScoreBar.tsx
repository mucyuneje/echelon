
interface ScoreBarProps { label: string; value: number; weight?: number; color?: string }

export default function ScoreBar({ label, value, weight, color = '#00C896' }: ScoreBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <div className="flex items-center gap-2">
          {weight !== undefined && <span className="text-white/25">×{(weight * 100).toFixed(0)}%</span>}
          <span className="text-white font-medium tabular-nums">{value}</span>
        </div>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}


type Fit = 'Strong Fit' | 'Good Fit' | 'Partial Fit' | 'Poor Fit'
const CONFIG: Record<Fit, { bg: string; text: string; dot: string }> = {
  'Strong Fit': { bg: 'bg-jade/10 border-jade/20', text: 'text-jade', dot: 'bg-jade' },
  'Good Fit':   { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  'Partial Fit':{ bg: 'bg-amber/10 border-amber/20', text: 'text-amber', dot: 'bg-amber' },
  'Poor Fit':   { bg: 'bg-crimson/10 border-crimson/20', text: 'text-crimson', dot: 'bg-crimson' },
}

export default function FitBadge({ fit }: { fit: Fit }) {
  const c = CONFIG[fit] || CONFIG['Partial Fit']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {fit}
    </span>
  )
}

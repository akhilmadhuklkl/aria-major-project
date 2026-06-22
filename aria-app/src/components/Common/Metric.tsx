import type { LucideIcon } from 'lucide-react'

export interface MetricProps {
  icon: LucideIcon
  label: string
  value: string
  change: string
}

export function Metric({ icon: Icon, label, value, change }: MetricProps) {
  return (
    <div className="metric">
      <div className="metric-icon"><Icon size={18} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{change}</small>
    </div>
  )
}

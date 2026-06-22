import { MessageCircle, Star, Check, Edit3 } from 'lucide-react'
import { Metric } from '../Common/Metric'
import type { AnalyticsSummary } from '../../types'

export function MetricStrip({ summary }: { summary?: AnalyticsSummary }) {
  return (
    <div className="metric-strip">
      <Metric icon={MessageCircle} label="Conversations" value={String(summary?.conversations ?? 248)} change="Persisted support sessions" />
      <Metric icon={Star} label="Average rating" value={summary?.averageRating ? summary.averageRating.toFixed(1) : '—'} change={`${summary?.feedbackRecords ?? 0} feedback records`} />
      <Metric icon={Check} label="AI acceptance rate" value={`${summary?.acceptanceRate ?? 0}%`} change="Based on agent actions" />
      <Metric icon={Edit3} label="Agent correction rate" value={`${summary?.correctionRate ?? 0}%`} change="Based on edited replies" />
    </div>
  )
}

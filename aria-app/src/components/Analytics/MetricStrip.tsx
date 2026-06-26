import { BrainCircuit, Check, Edit3, Star } from 'lucide-react'
import { Metric } from '../Common/Metric'
import type { AnalyticsSummary } from '../../types'

export function MetricStrip({ summary }: { summary?: AnalyticsSummary }) {
  const feedbackRecords = summary?.feedbackRecords ?? 0
  const learnedSourceCount = summary?.learningSignals?.learnedSourceCount ?? 0
  const trackedSourceCount = summary?.learningSignals?.trackedSourceCount ?? 0

  return (
    <div className="metric-strip">
      <Metric icon={Star} label="Average rating" value={summary?.averageRating ? summary.averageRating.toFixed(1) : '-'} change={`${feedbackRecords} feedback records`} />
      <Metric icon={BrainCircuit} label="Learning sources" value={`${learnedSourceCount}/${trackedSourceCount}`} change="Sources with feedback adjustment" />
      <Metric icon={Check} label="AI acceptance rate" value={`${summary?.acceptanceRate ?? 0}%`} change="Based on agent actions" />
      <Metric icon={Edit3} label="Source quality" value={`${summary?.learningSignals?.averageSourceQuality ?? 0}/100`} change="Average tracked source score" />
    </div>
  )
}

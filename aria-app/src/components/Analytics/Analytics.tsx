import { BarChart3, ChevronDown, ShieldCheck } from 'lucide-react'
import { MetricStrip } from './MetricStrip'
import { ChartsSection } from './ChartsSection'
import { InsightsSection } from './InsightsSection'
import { LearningSources } from './LearningSources'
import type { AnalyticsSummary } from '../../types'

export function Analytics({ summary }: { summary?: AnalyticsSummary }) {
  return (
    <section className="page-view analytics-view">
      <div className="page-intro analytics-intro">
        <div className="analytics-title">
          <div className="analytics-mark"><BarChart3 size={18} /></div>
          <div><h2>Support performance</h2><p>Track response quality, customer feedback, and agent-assist effectiveness.</p></div>
        </div>
        <div className="analytics-status"><ShieldCheck size={14} /> Learning loop active</div>
        <button className="filter-button">Last 7 days <ChevronDown size={15} /></button>
      </div>
      <MetricStrip summary={summary} />
      <ChartsSection topics={summary?.topics} quality={summary?.averageQuality} />
      <LearningSources strongestSources={summary?.strongestSources} reviewSources={summary?.reviewSources} />
      <InsightsSection summary={summary} />
    </section>
  )
}

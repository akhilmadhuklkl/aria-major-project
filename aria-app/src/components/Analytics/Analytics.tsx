import { useState } from 'react'
import { BarChart3, RefreshCw, ShieldCheck } from 'lucide-react'
import { MetricStrip } from './MetricStrip'
import { ChartsSection } from './ChartsSection'
import { InsightsSection } from './InsightsSection'
import { LearningSources } from './LearningSources'
import type { AnalyticsSummary } from '../../types'

export function Analytics({ summary, onRefresh }: { summary?: AnalyticsSummary; onRefresh: () => Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    if (refreshing) return

    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <section className="page-view analytics-view">
      <div className="page-intro analytics-intro">
        <div className="analytics-title">
          <div className="analytics-mark"><BarChart3 size={18} /></div>
          <div><h2>Support performance</h2><p>Track response quality, customer feedback, and agent-assist effectiveness.</p></div>
        </div>
        <div className="analytics-status"><ShieldCheck size={14} /> Learning loop active</div>
        <div className="analytics-range">Last 7 days</div>
        <button
          className="filter-button"
          aria-label="Refresh analytics data"
          title="Refresh analytics data from backend"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw size={15} /> {refreshing ? 'Refreshing...' : 'Refresh data'}
        </button>
      </div>
      <MetricStrip summary={summary} />
      <ChartsSection topics={summary?.topics} quality={summary?.averageQuality} />
      <LearningSources strongestSources={summary?.strongestSources} reviewSources={summary?.reviewSources} />
      <InsightsSection summary={summary} />
    </section>
  )
}

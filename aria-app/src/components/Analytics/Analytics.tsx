import { useState } from 'react'
import { BarChart3, Download, RefreshCw, ShieldCheck } from 'lucide-react'
import { MetricStrip } from './MetricStrip'
import { ChartsSection } from './ChartsSection'
import { InsightsSection } from './InsightsSection'
import { LearningSources } from './LearningSources'
import { RetrievalBreakdown } from './RetrievalBreakdown'
import { ProviderBreakdown } from './ProviderBreakdown'
import { QualityReport } from './QualityReport'
import type { AnalyticsSummary } from '../../types'

export function Analytics({ summary, onRefresh }: { summary?: AnalyticsSummary; onRefresh: (range?: string) => Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState('7d')

  async function refresh() {
    if (refreshing) return

    setRefreshing(true)
    try {
      await onRefresh(range)
    } finally {
      setRefreshing(false)
    }
  }

  function exportCsv() {
    const rows = [
      ['Metric', 'Value'],
      ['Range', summary?.range ?? range],
      ['Conversations', String(summary?.conversations ?? 0)],
      ['Assistant responses', String(summary?.assistantResponses ?? 0)],
      ['Average rating', String(summary?.averageRating ?? 0)],
      ['Average quality', String(summary?.averageQuality ?? 0)],
      ['Average latency (ms)', String(summary?.averageLatencyMs ?? 0)],
      ['Average confidence', summary?.averageConfidence == null ? '0' : `${Math.round(summary.averageConfidence * 100)}%`],
      ['Escalations', String(summary?.escalations ?? 0)],
      ['Escalation rate', `${summary?.escalationRate ?? 0}%`],
      ['Feedback records', String(summary?.feedbackRecords ?? 0)],
      [],
      ['Retrieval method', 'Responses'],
      ...(summary?.retrieval ?? []).map((item) => [item.method, String(item.count)]),
      [],
      ['Generation provider', 'Responses'],
      ...(summary?.providers ?? []).map((item) => [item.provider, String(item.count)]),
      [],
      ['Quality trend day', 'Quality', 'Rating'],
      ...(summary?.qualityTrend ?? []).map((item) => [item.day, String(item.quality), String(item.rating)]),
    ]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `aria-analytics-${range}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page-view analytics-view">
      <div className="page-intro analytics-intro">
        <div className="analytics-title">
          <div className="analytics-mark"><BarChart3 size={18} /></div>
          <div><h2>Support performance</h2><p>Track response quality, customer feedback, and agent-assist effectiveness.</p></div>
        </div>
        <div className="analytics-status"><ShieldCheck size={14} /> Learning loop active</div>
        <select className="analytics-range-select" value={range} onChange={(event) => { setRange(event.target.value); void onRefresh(event.target.value) }} aria-label="Analytics date range">
          <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all">All time</option>
        </select>
        <button className="filter-button" onClick={exportCsv} disabled={!summary} aria-label="Export analytics CSV" title="Export analytics CSV"><Download size={15} /> Export CSV</button>
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
      <QualityReport summary={summary} />
      <div className="analytics-summary-line">
        <span><strong>{summary?.assistantResponses ?? 0}</strong> assistant responses</span>
        <span><strong>{summary?.escalations ?? 0}</strong> escalations ({summary?.escalationRate ?? 0}%)</span>
        <span><strong>{(summary?.retrieval ?? []).find((item) => item.method === 'hybrid')?.count ?? 0}</strong> hybrid retrieval responses</span>
      </div>
      <ChartsSection topics={summary?.topics} quality={summary?.averageQuality} qualityTrend={summary?.qualityTrend} />
      <LearningSources strongestSources={summary?.strongestSources} reviewSources={summary?.reviewSources} />
      <RetrievalBreakdown retrieval={summary?.retrieval} />
      <ProviderBreakdown providers={summary?.providers} />
      <InsightsSection summary={summary} />
    </section>
  )
}

import { Sparkles, ThumbsDown, Users } from 'lucide-react'
import type { AnalyticsSummary } from '../../types'

export function InsightsSection({ summary }: { summary?: AnalyticsSummary }) {
  const learnedSourceCount = summary?.learningSignals?.learnedSourceCount ?? 0
  const strongestSource = summary?.strongestSources?.[0]
  const reviewSource = summary?.reviewSources?.[0]
  const agentActionCount = summary?.learningSignals?.agentActionCount ?? 0

  return (
    <div className="insight-row">
      <div>
        <div className="insight-icon positive"><Sparkles size={18} /></div>
        <p>
          <strong>{learnedSourceCount} sources adapted</strong>
          <span>{strongestSource ? `${strongestSource.title} has the strongest quality evidence.` : 'Feedback signals will appear after rated AI responses.'}</span>
        </p>
      </div>
      <div>
        <div className="insight-icon warning"><ThumbsDown size={18} /></div>
        <p>
          <strong>{reviewSource ? 'Review source flagged' : 'No weak source flagged'}</strong>
          <span>{reviewSource ? `${reviewSource.title} needs review based on correction signals.` : 'Current source feedback is above the review threshold.'}</span>
        </p>
      </div>
      <div>
        <div className="insight-icon neutral"><Users size={18} /></div>
        <p>
          <strong>{agentActionCount} agent actions recorded</strong>
          <span>Accepted, edited, and rejected replies are used as learning signals.</span>
        </p>
      </div>
    </div>
  )
}

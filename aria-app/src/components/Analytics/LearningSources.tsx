import { AlertTriangle, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LearningSource } from '../../types'

export function LearningSources({
  strongestSources,
  reviewSources,
}: {
  strongestSources?: LearningSource[]
  reviewSources?: LearningSource[]
}) {
  return (
    <div className="learning-grid">
      <LearningSourcePanel
        title="Strong learning signals"
        detail="Knowledge sources reinforced by positive feedback"
        icon={TrendingUp}
        tone="positive"
        empty="No source feedback has been captured yet."
        sources={strongestSources}
      />
      <LearningSourcePanel
        title="Review needed"
        detail="Sources with corrections, rejects, or weaker quality"
        icon={AlertTriangle}
        tone="warning"
        empty="No weak sources are currently flagged."
        sources={reviewSources}
      />
    </div>
  )
}

function LearningSourcePanel({
  title,
  detail,
  icon: Icon,
  tone,
  empty,
  sources,
}: {
  title: string
  detail: string
  icon: LucideIcon
  tone: 'positive' | 'warning'
  empty: string
  sources?: LearningSource[]
}) {
  return (
    <div className="learning-panel">
      <div className="learning-panel-heading">
        <div className={`insight-icon ${tone}`}><Icon size={17} /></div>
        <div><h3>{title}</h3><span>{detail}</span></div>
      </div>
      {sources?.length ? (
        <div className="learning-source-list">
          {sources.map((source) => (
            <div key={source.title} className="learning-source-card">
              <div>
                <strong>{source.title}</strong>
                <span>{source.feedbackCount} signals | {source.acceptedCount} accepted | {source.editedCount + source.rejectedCount} corrections</span>
              </div>
              <div className="quality-stack">
                <strong>{source.averageQuality}/100</strong>
                <span>{formatAdjustment(source.feedbackAdjustment)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="learning-empty">{empty}</p>
      )}
    </div>
  )
}

function formatAdjustment(value: number) {
  if (value === 0) return 'neutral'
  const percent = Math.round(value * 100)
  return `${percent > 0 ? '+' : ''}${percent}% learned`
}

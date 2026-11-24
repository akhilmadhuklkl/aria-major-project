import { BadgeCheck, CircleAlert, FileCheck2, ShieldCheck } from 'lucide-react'
import type { AnalyticsSummary } from '../../types'

export function QualityReport({ summary }: { summary?: AnalyticsSummary }) {
  const report = summary?.qualityReport
  const cards = [
    { icon: FileCheck2, label: 'Grounded responses', value: `${report?.groundedResponseRate ?? 0}%`, detail: `${report?.groundedResponses ?? 0} responses used source evidence.` },
    { icon: ShieldCheck, label: 'High confidence', value: `${report?.highConfidenceRate ?? 0}%`, detail: `${report?.highConfidenceResponses ?? 0} responses met the confidence threshold.` },
    { icon: CircleAlert, label: 'Low confidence', value: String(report?.lowConfidenceResponses ?? 0), detail: 'Responses requiring review or escalation.' },
    { icon: BadgeCheck, label: 'Sources to review', value: String(report?.reviewSourceCount ?? 0), detail: 'Knowledge sources flagged by feedback signals.' },
  ]

  return (
    <section className="quality-report" aria-label="Answer quality report">
      <div className="quality-report-heading"><div><h3>Answer quality report</h3><span>Evaluation signals from retrieval, confidence, and feedback.</span></div><strong>{summary?.assistantResponses ?? 0} responses</strong></div>
      <div className="quality-report-grid">
        {cards.map(({ icon: Icon, label, value, detail }) => <article key={label}><span className="quality-report-icon"><Icon size={16} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}
      </div>
    </section>
  )
}

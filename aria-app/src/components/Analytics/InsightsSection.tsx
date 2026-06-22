import { Sparkles, ThumbsDown, Users } from 'lucide-react'

export function InsightsSection() {
  return (
    <div className="insight-row">
      <div><div className="insight-icon positive"><Sparkles size={18} /></div><p><strong>Quality improved 16 points</strong><span>Knowledge retrieval and agent corrections improved answers this week.</span></p></div>
      <div><div className="insight-icon warning"><ThumbsDown size={18} /></div><p><strong>Refunds need attention</strong><span>Refund questions caused 38% of low-rated responses.</span></p></div>
      <div><div className="insight-icon neutral"><Users size={18} /></div><p><strong>32 minutes saved</strong><span>Estimated agent time saved through accepted suggestions.</span></p></div>
    </div>
  )
}

import { Activity, BrainCircuit, RefreshCw } from 'lucide-react'

export function KnowledgeSummary() {
  return (
    <div className="knowledge-summary">
      <div><BrainCircuit size={18} /><span><strong>5 indexed sources</strong><small>Ready for semantic retrieval</small></span></div>
      <div><Activity size={18} /><span><strong>382 retrieval uses</strong><small>Across support responses</small></span></div>
      <div><RefreshCw size={18} /><span><strong>Last indexed today</strong><small>All embeddings up to date</small></span></div>
    </div>
  )
}

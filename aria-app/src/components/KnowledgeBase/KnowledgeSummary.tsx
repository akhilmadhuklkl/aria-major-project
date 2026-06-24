import { Activity, BrainCircuit, RefreshCw } from 'lucide-react'
import type { KnowledgeItem } from '../../types'

export function KnowledgeSummary({ items }: { items: KnowledgeItem[] }) {
  const indexedCount = items.filter((item) => item.status === 'Indexed').length
  const retrievalUses = items.reduce((total, item) => total + item.uses, 0)
  const latestUpdate = items[0]?.updated ?? 'Not available'

  return (
    <div className="knowledge-summary">
      <div><BrainCircuit size={18} /><span><strong>{indexedCount} indexed sources</strong><small>Ready for grounded retrieval</small></span></div>
      <div><Activity size={18} /><span><strong>{retrievalUses} retrieval uses</strong><small>Across persisted support responses</small></span></div>
      <div><RefreshCw size={18} /><span><strong>Updated {latestUpdate}</strong><small>Stored in the SQLite knowledge base</small></span></div>
    </div>
  )
}

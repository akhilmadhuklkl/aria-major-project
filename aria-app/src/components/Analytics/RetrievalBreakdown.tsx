import { GitBranch } from 'lucide-react'

export function RetrievalBreakdown({ retrieval }: { retrieval?: Array<{ method: string; count: number }> }) {
  const rows = retrieval ?? []
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const labels: Record<string, string> = {
    hybrid: 'Hybrid retrieval',
    semantic: 'Semantic retrieval',
    keyword: 'Keyword fallback',
    none: 'No retrieval',
  }

  return (
    <div className="retrieval-breakdown">
      <div className="retrieval-heading">
        <div><div className="insight-icon neutral"><GitBranch size={17} /></div><div><h3>Retrieval coverage</h3><span>Methods used for assistant responses</span></div></div>
        <strong>{total} responses</strong>
      </div>
      {rows.length ? rows.map((row) => (
        <div className="retrieval-row" key={row.method}>
          <div><span>{labels[row.method] ?? row.method}</span><small>{total ? Math.round((row.count / total) * 100) : 0}%</small></div>
          <div className="retrieval-bar"><i style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} /></div>
          <strong>{row.count}</strong>
        </div>
      )) : <p className="learning-empty">Retrieval usage will appear after assistant responses are recorded.</p>}
    </div>
  )
}

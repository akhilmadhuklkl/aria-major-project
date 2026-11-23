import { Cpu } from 'lucide-react'

export function ProviderBreakdown({ providers }: { providers?: Array<{ provider: string; count: number }> }) {
  const rows = providers ?? []
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const labels: Record<string, string> = {
    'mastra-gemini': 'Mastra + Gemini',
    'local-knowledge': 'Local knowledge fallback',
    unknown: 'Unknown provider',
  }

  return (
    <div className="retrieval-breakdown">
      <div className="retrieval-heading">
        <div><div className="insight-icon positive"><Cpu size={17} /></div><div><h3>Generation providers</h3><span>Providers used for assistant responses</span></div></div>
        <strong>{total} responses</strong>
      </div>
      {rows.length ? rows.map((row) => (
        <div className="retrieval-row" key={row.provider}>
          <div><span>{labels[row.provider] ?? row.provider}</span><small>{total ? Math.round((row.count / total) * 100) : 0}%</small></div>
          <div className="retrieval-bar"><i style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} /></div>
          <strong>{row.count}</strong>
        </div>
      )) : <p className="learning-empty">Provider usage will appear after assistant responses are recorded.</p>}
    </div>
  )
}

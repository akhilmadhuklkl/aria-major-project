import { FileText, MoreHorizontal } from 'lucide-react'
import type { KnowledgeItem } from '../../types'

export interface KnowledgeTableProps {
  items: KnowledgeItem[]
}

export function KnowledgeTable({ items }: KnowledgeTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Document</th><th>Category</th><th>Status</th><th>Used in responses</th><th>Last updated</th><th /></tr></thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={6}>No knowledge records match the current search and filters.</td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.title}>
              <td><div className="doc-name"><FileText size={17} /><span><strong>{item.title}</strong><small>Grounding source for ARIA retrieval</small></span></div></td>
              <td>{item.category}</td>
              <td><span className={`status-tag ${item.status.toLowerCase()}`}><i /> {item.status}</span></td>
              <td>{item.uses}</td>
              <td>{item.updated}</td>
              <td><button className="icon-button"><MoreHorizontal size={17} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

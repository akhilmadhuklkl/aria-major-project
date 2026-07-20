import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, MoreHorizontal, Trash2 } from 'lucide-react'
import type { KnowledgeItem } from '../../types'

export interface KnowledgeTableProps {
  items: KnowledgeItem[]
  onDelete: (ids: number[]) => Promise<void>
}

export function KnowledgeTable({ items, onDelete }: KnowledgeTableProps) {
  const [expandedTitle, setExpandedTitle] = useState<string>()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const selectableIds = useMemo(() => items.map((item) => item.id).filter((id): id is number => Boolean(id)), [items])
  const visibleSelectedIds = selectedIds.filter((id) => selectableIds.includes(id))
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))
  const partiallySelected = visibleSelectedIds.length > 0 && !allSelected

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partiallySelected
    }
  }, [partiallySelected])

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((current) => (
      checked
        ? [...new Set([...current, id])]
        : current.filter((selectedId) => selectedId !== id)
    ))
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? selectableIds : [])
  }

  async function deleteIds(ids: number[]) {
    if (deleting || ids.length === 0) return

    setDeleting(true)
    try {
      await onDelete(ids)
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)))
      const deletedTitles = items.filter((item) => item.id && ids.includes(item.id)).map((item) => item.title)
      if (expandedTitle && deletedTitles.includes(expandedTitle)) {
        setExpandedTitle(undefined)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="knowledge-table-section">
      {visibleSelectedIds.length > 0 && (
        <div className="bulk-actions">
          <strong>{visibleSelectedIds.length} selected</strong>
          <button className="danger-button" disabled={deleting} onClick={() => void deleteIds(visibleSelectedIds)}>
            <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete selected'}
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table>
        <thead>
          <tr>
            <th className="select-column">
              <input
                ref={selectAllRef}
                type="checkbox"
                aria-label="Select all visible knowledge records"
                checked={allSelected}
                disabled={selectableIds.length === 0 || deleting}
                onChange={(event) => toggleAll(event.target.checked)}
              />
            </th>
            <th>Document</th>
            <th>Category</th>
            <th>Status</th>
            <th>Used in responses</th>
            <th>Last updated</th>
            <th aria-label="Row actions" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={7}>No knowledge records match the current search and filters.</td>
            </tr>
          )}
          {items.map((item) => (
            <Fragment key={item.title}>
              <tr key={item.title}>
                <td className="select-column">
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.title}`}
                    checked={Boolean(item.id && selectedIds.includes(item.id))}
                    disabled={!item.id || deleting}
                    onChange={(event) => item.id && toggleSelected(item.id, event.target.checked)}
                  />
                </td>
                <td><div className="doc-name"><FileText size={17} /><span><strong>{item.title}</strong><small>Grounding source for ARIA retrieval</small></span></div></td>
                <td>{item.category}</td>
                <td><span className={`status-tag ${item.status.toLowerCase()}`}><i /> {item.status}</span></td>
                <td>{item.uses}</td>
                <td>{item.updated}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Actions for ${item.title}`}
                      title="View knowledge details"
                      onClick={() => setExpandedTitle((current) => current === item.title ? undefined : item.title)}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    <button
                      className="danger-icon-button"
                      aria-label={`Delete ${item.title}`}
                      title="Delete knowledge record"
                      disabled={!item.id || deleting}
                      onClick={() => item.id && void deleteIds([item.id])}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              {expandedTitle === item.title && (
                <tr key={`${item.title}-details`}>
                  <td className="knowledge-detail-row" colSpan={7}>
                    <strong>{item.title}</strong>
                    <span>{item.content || 'This knowledge source is indexed and ready for retrieval.'}</span>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

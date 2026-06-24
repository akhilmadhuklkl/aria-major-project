import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Search, X } from 'lucide-react'
import type { KnowledgeItem, NewKnowledgeItem } from '../../types'
import { KnowledgeTable } from './KnowledgeTable'
import { KnowledgeSummary } from './KnowledgeSummary'

export interface KnowledgeBaseProps {
  query: string
  setQuery: (value: string) => void
  items: KnowledgeItem[]
  onAdd: (input: NewKnowledgeItem) => Promise<void>
}

export function KnowledgeBase({ query, setQuery, items, onAdd }: KnowledgeBaseProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<NewKnowledgeItem>({
    title: '',
    category: 'FAQ',
    content: '',
    status: 'indexed',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const visibleItems = useMemo(
    () => items.filter((item) => (
      item.title.toLowerCase().includes(query.toLowerCase())
      && (categoryFilter === 'all' || item.category === categoryFilter)
      && (statusFilter === 'all' || item.status === statusFilter)
    )),
    [categoryFilter, items, query, statusFilter],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onAdd(form)
      setForm({ title: '', category: 'FAQ', content: '', status: 'indexed' })
      setIsAdding(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Knowledge could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-view">
      <div className="page-intro">
        <div><h2>Business knowledge</h2><p>Manage the policies, procedures, and FAQs used to ground ARIA responses.</p></div>
        <button className="primary-button" onClick={() => setIsAdding((current) => !current)}>
          {isAdding ? <X size={16} /> : <Plus size={16} />} {isAdding ? 'Close' : 'Add knowledge'}
        </button>
      </div>
      <div className="knowledge-toolbar">
        <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search knowledge" /></label>
        <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          <option value="FAQ">FAQ</option>
          <option value="Policy">Policy</option>
          <option value="Procedure">Procedure</option>
          <option value="Product">Product</option>
        </select>
        <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="Indexed">Indexed</option>
          <option value="Review">Review</option>
        </select>
      </div>
      {isAdding && (
        <form className="knowledge-form" onSubmit={submit}>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            <span>Category</span>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option>FAQ</option>
              <option>Policy</option>
              <option>Procedure</option>
              <option>Product</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as NewKnowledgeItem['status'] })}>
              <option value="indexed">Indexed</option>
              <option value="review">Review</option>
            </select>
          </label>
          <label className="knowledge-content">
            <span>Answering note</span>
            <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required />
          </label>
          {error && <p className="inline-error">{error}</p>}
          <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save knowledge'}</button>
        </form>
      )}
      <KnowledgeTable items={visibleItems} />
      <KnowledgeSummary items={items} />
    </section>
  )
}

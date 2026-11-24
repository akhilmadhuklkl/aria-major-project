import { useMemo, useState, type FormEvent } from 'react'
import { BookOpenCheck, Plus, Search, ShieldCheck, Upload, X } from 'lucide-react'
import type { GraphNode, GraphRelationship, KnowledgeItem, KnowledgeVersion, NewKnowledgeItem } from '../../types'
import { api } from '../../api'
import { KnowledgeGraphCanvas } from './KnowledgeGraphCanvas'
import { KnowledgeTable } from './KnowledgeTable'
import { KnowledgeSummary } from './KnowledgeSummary'

function labelForGraphNode(node: GraphNode) {
  return String(node.properties.title ?? node.properties.name ?? node.id)
}

export interface KnowledgeBaseProps {
  query: string
  setQuery: (value: string) => void
  items: KnowledgeItem[]
  onAdd: (input: NewKnowledgeItem) => Promise<void>
  onUpload: (file: File, category: string, title?: string) => Promise<void>
  onDelete: (ids: number[]) => Promise<void>
  onArchive: (ids: number[]) => Promise<void>
  onUpdate: (id: number, input: NewKnowledgeItem) => Promise<void>
  onGetVersions: (id: number) => Promise<KnowledgeVersion[]>
  archivedItems: KnowledgeItem[]
  onRestore: (ids: number[]) => Promise<void>
  onRefreshGraph: () => Promise<void>
  onGraphNodeDeleted: (nodeId: string) => void
  onGetGraphPaths: (id: string) => Promise<{ node: GraphNode; paths: Array<{ nodes: string[]; relationships: string[] }> }>
  graphNodes: GraphNode[]
  graphRelationships: GraphRelationship[]
}

export function KnowledgeBase({ query, setQuery, items, onAdd, onUpload, onDelete, onArchive, onUpdate, onGetVersions, archivedItems, onRestore, onRefreshGraph, onGraphNodeDeleted, onGetGraphPaths, graphNodes, graphRelationships }: KnowledgeBaseProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [form, setForm] = useState<NewKnowledgeItem>({
    title: '',
    category: 'FAQ',
    content: '',
    status: 'indexed',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File>()
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('FAQ')
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeSection, setActiveSection] = useState<'documents' | 'graph'>('documents')
  const [showArchived, setShowArchived] = useState(false)
  const [graphNodeForm, setGraphNodeForm] = useState({ id: '', type: 'SupportIssue', label: '' })
  const [graphRelationshipForm, setGraphRelationshipForm] = useState({ sourceId: '', targetId: '', type: 'RELATED_TO' })
  const [graphSaving, setGraphSaving] = useState(false)
  const visibleItems = useMemo(
    () => (showArchived ? archivedItems : items).filter((item) => (
      item.title.toLowerCase().includes(query.toLowerCase())
      && (categoryFilter === 'all' || item.category === categoryFilter)
      && (statusFilter === 'all' || item.status === statusFilter)
    )),
    [archivedItems, categoryFilter, items, query, showArchived, statusFilter],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onAdd(form)
      setForm({ title: '', category: 'FAQ', content: '', status: 'indexed' })
      setQuery('')
      setCategoryFilter('all')
      setStatusFilter('all')
      setIsAdding(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Knowledge could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItems(ids: number[]) {
    setError('')

    try {
      await onDelete(ids)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Knowledge could not be deleted.')
      throw caught
    }
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!uploadFile || uploading) return
    setUploading(true)
    setError('')
    try {
      await onUpload(uploadFile, uploadCategory, uploadTitle)
      setUploadFile(undefined)
      setUploadTitle('')
      setIsUploading(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The document could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  async function createGraphNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGraphSaving(true)
    setError('')
    try {
      await api.createGraphNode({ id: graphNodeForm.id.trim(), type: graphNodeForm.type, properties: { title: graphNodeForm.label.trim() } })
      await onRefreshGraph()
      setGraphNodeForm({ id: '', type: 'SupportIssue', label: '' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The graph node could not be saved.')
    } finally {
      setGraphSaving(false)
    }
  }

  async function createGraphRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGraphSaving(true)
    setError('')
    try {
      await api.createGraphRelationship({ sourceId: graphRelationshipForm.sourceId, targetId: graphRelationshipForm.targetId, type: graphRelationshipForm.type.trim().toUpperCase() })
      await onRefreshGraph()
      setGraphRelationshipForm({ sourceId: '', targetId: '', type: 'RELATED_TO' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The graph relationship could not be saved.')
    } finally {
      setGraphSaving(false)
    }
  }

  async function deleteGraphNode(node: GraphNode) {
    await api.deleteGraphNode(node.id)
    onGraphNodeDeleted(node.id)
  }

  async function deleteGraphRelationship(relationship: GraphRelationship) {
    await api.deleteGraphRelationship(relationship)
    await onRefreshGraph()
  }

  async function updateGraphNode(node: GraphNode, label: string) {
    await api.createGraphNode({ id: node.id, type: node.type, properties: { ...node.properties, title: label } })
    await onRefreshGraph()
  }

  async function updateGraphRelationship(relationship: GraphRelationship, type: string) {
    await api.deleteGraphRelationship(relationship)
    await api.createGraphRelationship({ sourceId: relationship.sourceId, targetId: relationship.targetId, type })
    await onRefreshGraph()
  }

  return (
    <section className="page-view knowledge-view">
      <div className="page-intro knowledge-intro">
        <div className="knowledge-title">
          <div className="knowledge-mark"><BookOpenCheck size={18} /></div>
          <div><h2>Business knowledge</h2><p>Manage the policies, procedures, and FAQs used to ground ARIA responses.</p></div>
        </div>
        <div className="knowledge-status"><ShieldCheck size={14} /> Retrieval ready</div>
        <button className="primary-button" onClick={() => setIsAdding((current) => !current)}>
          {isAdding ? <X size={16} /> : <Plus size={16} />} {isAdding ? 'Close' : 'Add knowledge'}
        </button>
        <button className="secondary-button" onClick={() => setIsUploading((current) => !current)}>
          {isUploading ? <X size={16} /> : <Upload size={16} />} {isUploading ? 'Close' : 'Upload document'}
        </button>
        <button className="secondary-button" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Active documents' : 'Archived documents'}</button>
      </div>
      <div className="knowledge-tabs" role="tablist" aria-label="Knowledge views">
        <button className={activeSection === 'documents' ? 'active' : ''} role="tab" aria-selected={activeSection === 'documents'} onClick={() => setActiveSection('documents')}>Documents</button>
        <button className={activeSection === 'graph' ? 'active' : ''} role="tab" aria-selected={activeSection === 'graph'} onClick={() => setActiveSection('graph')}>Graph Explorer</button>
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
            <input aria-label="Knowledge title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
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
            <textarea aria-label="Knowledge answering note" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required />
          </label>
          {error && <p className="inline-error">{error}</p>}
          <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save knowledge'}</button>
        </form>
      )}
      {isUploading && (
        <form className="knowledge-form upload-form" onSubmit={submitUpload}>
          <label>
            <span>Document file</span>
            <input type="file" accept=".pdf,.docx,.txt,.csv,application/pdf,text/plain,text/csv" required onChange={(event) => setUploadFile(event.target.files?.[0])} />
          </label>
          <label>
            <span>Title (optional)</span>
            <input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Uses the filename when empty" />
          </label>
          <label>
            <span>Category</span>
            <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
              <option>FAQ</option><option>Policy</option><option>Procedure</option><option>Product</option>
            </select>
          </label>
          <button className="primary-button" disabled={!uploadFile || uploading}>{uploading ? 'Indexing...' : 'Upload and index'}</button>
          <p className="form-hint">Supported: PDF, DOCX, TXT, CSV. Maximum size: 10 MB.</p>
        </form>
      )}
      {error && !isAdding && <p className="inline-error knowledge-error">{error}</p>}
      {activeSection === 'graph' && (
        <div className="graph-explorer">
          <div className="graph-explorer-heading"><div><strong>Knowledge Graph</strong><span>Ontology nodes connected by verified relationships</span></div><span>{graphNodes.length} nodes · {graphRelationships.length} links</span></div>
          <div className="graph-management-grid">
            <form className="graph-management-form" onSubmit={createGraphNode}>
              <strong>Add ontology node</strong>
              <input aria-label="Ontology node id" value={graphNodeForm.id} onChange={(event) => setGraphNodeForm({ ...graphNodeForm, id: event.target.value })} placeholder="Stable id, e.g. issue:delivery-delay" required />
              <select value={graphNodeForm.type} onChange={(event) => setGraphNodeForm({ ...graphNodeForm, type: event.target.value })} aria-label="Ontology node type">
                {['Customer', 'Order', 'Product', 'Payment', 'Refund', 'Delivery', 'Subscription', 'SupportIssue', 'SupportProcedure', 'KnowledgeDocument', 'SupportAgent'].map((type) => <option key={type}>{type}</option>)}
              </select>
              <input aria-label="Ontology node label" value={graphNodeForm.label} onChange={(event) => setGraphNodeForm({ ...graphNodeForm, label: event.target.value })} placeholder="Display label" required />
              <button className="secondary-button" disabled={graphSaving}>Save node</button>
            </form>
            <form className="graph-management-form" onSubmit={createGraphRelationship}>
              <strong>Connect nodes</strong>
              <select value={graphRelationshipForm.sourceId} onChange={(event) => setGraphRelationshipForm({ ...graphRelationshipForm, sourceId: event.target.value })} aria-label="Relationship source" required>
                <option value="">Source node</option>
                {graphNodes.map((node) => <option key={node.id} value={node.id}>{labelForGraphNode(node)}</option>)}
              </select>
              <input value={graphRelationshipForm.type} onChange={(event) => setGraphRelationshipForm({ ...graphRelationshipForm, type: event.target.value })} placeholder="Relationship, e.g. REPORTS" required />
              <select value={graphRelationshipForm.targetId} onChange={(event) => setGraphRelationshipForm({ ...graphRelationshipForm, targetId: event.target.value })} aria-label="Relationship target" required>
                <option value="">Target node</option>
                {graphNodes.map((node) => <option key={node.id} value={node.id}>{labelForGraphNode(node)}</option>)}
              </select>
              <button className="secondary-button" disabled={graphSaving}>Save link</button>
            </form>
          </div>
          {graphNodes.length ? <KnowledgeGraphCanvas nodes={graphNodes} relationships={graphRelationships} onDeleteNode={deleteGraphNode} onDeleteRelationship={deleteGraphRelationship} onUpdateNode={updateGraphNode} onUpdateRelationship={updateGraphRelationship} onGetGraphPaths={onGetGraphPaths} /> : <p className="table-empty">No ontology nodes are available yet.</p>}
        </div>
      )}
      {activeSection === 'documents' && <>
        <KnowledgeTable items={visibleItems} onDelete={deleteItems} onArchive={onArchive} onUpdate={onUpdate} onGetVersions={onGetVersions} archived={showArchived} onRestore={onRestore} />
        <KnowledgeSummary items={items} />
      </>}
    </section>
  )
}

import { useState } from 'react'
import { BookOpenCheck, Bot, BrainCircuit, ChartColumn, CheckCircle2, Database, GitBranch, PlugZap, Plus, Server, Settings, Trash2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AnalyticsSummary, AuditLog, KnowledgeItem, SystemStatus, WebhookSubscription } from '../../types'

type ModalType = 'help' | 'settings'

interface AppModalProps {
  type: ModalType
  knowledgeItems: KnowledgeItem[]
  analytics?: AnalyticsSummary
  systemStatus?: SystemStatus
  auditLogs: AuditLog[]
  webhooks: WebhookSubscription[]
  isAdmin: boolean
  onCreateWebhook: (input: { name: string; url: string; events: string[] }) => Promise<string | undefined>
  onDeleteWebhook: (id: number) => Promise<void>
  onClose: () => void
}

const demoSteps = [
  {
    icon: Bot,
    title: 'Customer chat',
    text: 'Ask a support question and verify ARIA returns a grounded answer with confidence, retrieval method, provider, and source evidence.',
  },
  {
    icon: BrainCircuit,
    title: 'Agent workspace',
    text: 'Review the AI suggestion, inspect sources, then accept, edit, regenerate, or reject the response to store an agent action.',
  },
  {
    icon: BookOpenCheck,
    title: 'Knowledge base',
    text: 'Show the indexed policy, FAQ, and procedure records used by semantic retrieval for grounded response generation.',
  },
  {
    icon: ChartColumn,
    title: 'Analytics',
    text: 'Explain the learning loop through ratings, source quality, acceptance rate, feedback signals, and review-needed sources.',
  },
]

export function AppModal({ type, knowledgeItems, analytics, systemStatus, auditLogs, webhooks, isAdmin, onCreateWebhook, onDeleteWebhook, onClose }: AppModalProps) {
  const indexedSources = knowledgeItems.filter((item) => item.status === 'Indexed').length
  const totalSources = knowledgeItems.length
  const backendStatus = systemStatus?.backend.status === 'operational' ? 'Operational' : 'Checking'
  const databaseStatus = systemStatus
    ? `${systemStatus.database.engine.toUpperCase()} ${systemStatus.database.status}`
    : 'SQLite active'
  const retrievalStatus = systemStatus
    ? `${systemStatus.retrieval.primary} ready`
    : 'Semantic ready'
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="app-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <span className="modal-mark">{type === 'help' ? <BookOpenCheck size={18} /> : <Settings size={18} />}</span>
            <div>
              <h2>{type === 'help' ? 'Demo help' : 'System settings'}</h2>
              <p>{type === 'help' ? 'Quick guide for presenting ARIA clearly.' : 'Read-only project configuration status.'}</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal" title="Close"><X size={16} /></button>
        </header>

        {type === 'help' ? (
          <div className="modal-section">
            <div className="modal-callout">
              <CheckCircle2 size={18} />
              <div>
                <strong>Recommended demo flow</strong>
                <span>Customer query to grounded AI response to agent action to feedback learning to analytics evidence.</span>
              </div>
            </div>
            <div className="modal-list">
              {demoSteps.map((step) => {
                const Icon = step.icon
                return (
                  <article className="modal-row" key={step.title}>
                    <span><Icon size={17} /></span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="modal-section">
            <div className="settings-grid">
              <StatusTile
                icon={Server}
                label="Backend API"
                value={backendStatus}
                detail={systemStatus
                  ? `${systemStatus.backend.service} is serving ${systemStatus.backend.apiBase}.`
                  : 'Express API with health, chat, feedback, agent actions, analytics, and knowledge routes.'}
              />
              <StatusTile
                icon={Database}
                label="Database"
                value={databaseStatus}
                detail={systemStatus
                  ? `${systemStatus.database.knowledgeRecords} knowledge records, ${systemStatus.database.indexedKnowledgeRecords} indexed, ${systemStatus.database.conversations} conversations, ${systemStatus.database.feedbackRecords} feedback records.`
                  : `${totalSources} knowledge records, ${indexedSources} indexed for retrieval.`}
              />
              <StatusTile
                icon={GitBranch}
                label="Graph store"
                value={systemStatus?.graphStore === 'neo4j' ? 'Neo4j active' : 'SQLite active'}
                detail={systemStatus?.graphStore === 'neo4j'
                  ? 'Ontology nodes, relationships, paths, and graph-aware retrieval are using Neo4j.'
                  : 'Ontology nodes, relationships, paths, and graph-aware retrieval are using SQLite.'}
              />
              <StatusTile
                icon={BrainCircuit}
                label="Retrieval"
                value={retrievalStatus}
                detail={systemStatus
                  ? `${systemStatus.retrieval.storedEmbeddings} embeddings stored with ${systemStatus.retrieval.dimensions} dimensions; semantic threshold ${systemStatus.retrieval.semanticThreshold ?? 'default'}, hybrid threshold ${systemStatus.retrieval.hybridThreshold ?? 'default'}, confidence threshold ${systemStatus.retrieval.confidenceThreshold ?? 'default'}.`
                  : 'Stored embeddings and source scoring are enabled for grounded answer generation.'}
              />
              <StatusTile
                icon={PlugZap}
                label="AI generation"
                value={systemStatus?.ai.agentProvider === 'mastra-remote' ? 'Mastra remote' : 'Local fallback'}
                detail={systemStatus
                  ? `${systemStatus.ai.agentProvider} with ${systemStatus.ai.llmProvider} using ${systemStatus.ai.model}; provider key ${systemStatus.ai.providerConfigured ? 'configured' : 'not configured'}.`
                  : 'Mastra Cloud server and Studio are deployed, with Gemini-backed agent responses and observability traces verified.'}
              />
            </div>
            <div className="modal-callout muted">
              <ChartColumn size={18} />
              <div>
                <strong>Learning summary</strong>
                <span>
                  {systemStatus
                    ? `${systemStatus.learning.learnedSources} learned sources from ${systemStatus.learning.trackedSources} tracked sources, with ${systemStatus.database.feedbackRecords} feedback records captured.`
                    : analytics
                    ? `${analytics.conversations} conversations, ${analytics.feedbackRecords} feedback records, ${analytics.learningSignals.trackedSourceCount} tracked sources.`
                    : 'Analytics will load from the backend when the API is available.'}
                </span>
              </div>
            </div>
            {isAdmin && <div className="audit-log-section">
              <div className="audit-log-heading"><strong>Recent audit activity</strong><span>{auditLogs.length} recent entries</span></div>
              {auditLogs.length > 0 ? auditLogs.map((log) => (
                <div className="audit-log-row" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{log.entityType}{log.entityId ? ` #${log.entityId}` : ''} · {log.actorEmail ?? 'local-demo'}</span>
                  <time>{new Date(log.createdAt).toLocaleString()}</time>
                </div>
              )) : <p className="audit-log-empty">No recorded administrative activity yet.</p>}
            </div>}
            {isAdmin && <WebhookSettings webhooks={webhooks} onCreate={onCreateWebhook} onDelete={onDeleteWebhook} />}
          </div>
        )}
      </section>
    </div>
  )
}

function WebhookSettings({
  webhooks,
  onCreate,
  onDelete,
}: {
  webhooks: WebhookSubscription[]
  onCreate: AppModalProps['onCreateWebhook']
  onDelete: AppModalProps['onDeleteWebhook']
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [event, setEvent] = useState('knowledge.indexed')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault()
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    setError('')
    try {
      const createdSecret = await onCreate({ name: name.trim(), url: url.trim(), events: [event] })
      setSecret(createdSecret ?? '')
      setName('')
      setUrl('')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Webhook could not be created.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="webhook-section">
      <div className="audit-log-heading"><strong>Webhook integrations</strong><span>{webhooks.length} configured</span></div>
      <form className="webhook-form" onSubmit={(eventObject) => void submit(eventObject)}>
        <input value={name} onChange={(eventObject) => setName(eventObject.target.value)} placeholder="Integration name" aria-label="Webhook integration name" />
        <input value={url} onChange={(eventObject) => setUrl(eventObject.target.value)} placeholder="https://example.com/aria" type="url" aria-label="Webhook HTTPS URL" />
        <select value={event} onChange={(eventObject) => setEvent(eventObject.target.value)} aria-label="Webhook event">
          <option value="knowledge.indexed">Knowledge indexed</option>
          <option value="feedback.low_rating">Low rating</option>
          <option value="agent_action.corrected">Agent correction</option>
        </select>
        <button className="icon-button" type="submit" disabled={saving || !name.trim() || !url.trim()} aria-label="Add webhook" title="Add webhook"><Plus size={16} /></button>
      </form>
      {error && <p className="notification-error" role="alert">{error}</p>}
      {secret && <p className="webhook-secret" role="status"><strong>Copy this signing secret now:</strong> {secret}</p>}
      {webhooks.length > 0 ? webhooks.map((webhook) => (
        <div className="webhook-row" key={webhook.id}>
          <div><strong>{webhook.name}</strong><span>{webhook.url}</span><small>{webhook.events.join(', ')}</small></div>
          <button className="danger-icon-button" onClick={() => { if (window.confirm(`Delete webhook "${webhook.name}"?`)) void onDelete(webhook.id) }} aria-label={`Delete ${webhook.name}`} title="Delete webhook"><Trash2 size={14} /></button>
        </div>
      )) : <p className="audit-log-empty">No webhook integrations configured.</p>}
    </div>
  )
}

interface StatusTileProps {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}

function StatusTile({ icon: Icon, label, value, detail }: StatusTileProps) {
  return (
    <article className="settings-tile">
      <span><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  )
}

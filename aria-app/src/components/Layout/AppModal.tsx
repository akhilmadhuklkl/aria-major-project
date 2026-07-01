import { BookOpenCheck, Bot, BrainCircuit, ChartColumn, CheckCircle2, Database, PlugZap, Server, Settings, X } from 'lucide-react'
import type { AnalyticsSummary, KnowledgeItem } from '../../types'

type ModalType = 'help' | 'settings'

interface AppModalProps {
  type: ModalType
  knowledgeItems: KnowledgeItem[]
  analytics?: AnalyticsSummary
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

export function AppModal({ type, knowledgeItems, analytics, onClose }: AppModalProps) {
  const indexedSources = knowledgeItems.filter((item) => item.status === 'Indexed').length
  const totalSources = knowledgeItems.length

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
              <StatusTile icon={Server} label="Backend API" value="Operational" detail="Express API with health, chat, feedback, agent actions, analytics, and knowledge routes." />
              <StatusTile icon={Database} label="Database" value="SQLite active" detail={`${totalSources} knowledge records, ${indexedSources} indexed for retrieval.`} />
              <StatusTile icon={BrainCircuit} label="Retrieval" value="Semantic ready" detail="Stored embeddings and source scoring are enabled for grounded answer generation." />
              <StatusTile icon={PlugZap} label="Mastra Cloud" value="Cloud connected" detail="Mastra Cloud server and Studio are deployed, with Gemini-backed agent responses and observability traces verified." />
            </div>
            <div className="modal-callout muted">
              <ChartColumn size={18} />
              <div>
                <strong>Learning summary</strong>
                <span>
                  {analytics
                    ? `${analytics.conversations} conversations, ${analytics.feedbackRecords} feedback records, ${analytics.learningSignals.trackedSourceCount} tracked sources.`
                    : 'Analytics will load from the backend when the API is available.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

interface StatusTileProps {
  icon: typeof Server
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

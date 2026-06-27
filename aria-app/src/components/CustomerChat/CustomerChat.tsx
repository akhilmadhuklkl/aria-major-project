import { Activity, BrainCircuit, Database, MessageSquareText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ChatMessage } from '../../types'
import { ChatHistory } from './ChatHistory'

export interface CustomerChatProps {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  send: () => void
  rating: number
  setRating: (value: number) => void
  feedbackSent: boolean
  submitFeedback: () => void
  feedbackLoading: boolean
  loading: boolean
  error: string
  mode: string
  sourceCount: number
}

export function CustomerChat({
  messages,
  input,
  setInput,
  send,
  rating,
  setRating,
  feedbackSent,
  submitFeedback,
  feedbackLoading,
  loading,
  error,
  mode,
  sourceCount,
}: CustomerChatProps) {
  return (
    <section className="customer-layout">
      <ChatHistory
        messages={messages}
        input={input}
        setInput={setInput}
        send={send}
        rating={rating}
        setRating={setRating}
        feedbackSent={feedbackSent}
        submitFeedback={submitFeedback}
        feedbackLoading={feedbackLoading}
        loading={loading}
        error={error}
      />
      <aside className="customer-context">
        <div className="customer-context-intro">
          <h2>Live support channel</h2>
          <p>Grounded responses, retrieval evidence, and feedback learning are visible in the same customer flow.</p>
        </div>
        <div className="context-status-grid">
          <StatusItem icon={Activity} label="Conversation" value="Active" tone="positive" />
          <StatusItem icon={BrainCircuit} label="AI mode" value={mode} />
          <StatusItem icon={MessageSquareText} label="Feedback" value={feedbackSent ? 'Captured' : 'Pending'} tone={feedbackSent ? 'positive' : 'warning'} />
          <StatusItem icon={Database} label="Sources" value={`${sourceCount} indexed`} />
        </div>
      </aside>
    </section>
  )
}

function StatusItem({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'positive' | 'warning' | 'neutral'
}) {
  return (
    <div className={`context-status-item ${tone}`}>
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

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
        <div><h2>Customer chat prototype</h2><p>This view demonstrates the direct customer experience, feedback collection, and automatic response flow.</p></div>
        <dl>
          <div><dt>Conversation state</dt><dd>Active</dd></div>
          <div><dt>AI mode</dt><dd>{mode}</dd></div>
          <div><dt>Feedback captured</dt><dd>{feedbackSent ? 'Yes' : 'Pending'}</dd></div>
          <div><dt>Knowledge sources</dt><dd>{sourceCount} indexed</dd></div>
        </dl>
      </aside>
    </section>
  )
}

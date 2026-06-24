import { Send } from 'lucide-react'
import type { ChatMessage } from '../../types'
import { Bot } from 'lucide-react'
import { FeedbackPrompt } from './FeedbackPrompt'

export interface ChatHistoryProps {
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
}

export function ChatHistory({
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
}: ChatHistoryProps) {
  return (
    <div className="customer-chat">
      <div className="customer-chat-header">
        <div className="ai-icon"><Bot size={18} /></div>
        <div><h2>ARIA Support</h2><span><i /> Typically replies instantly</span></div>
      </div>
      <div className="customer-message-list">
        {messages.map((message, index) => (
          <div key={message.id ?? `${message.from}-${index}`} className={`customer-bubble ${message.from}`}>
            {message.from === 'bot' && <div className="bubble-avatar"><Bot size={15} /></div>}
            <div className="customer-message-content">
              <p>{message.text}</p>
              {message.from === 'bot' && message.confidence !== undefined && (
                <div className="response-evidence">
                  <span>{Math.round(message.confidence * 100)}% confidence</span>
                  {message.sources?.map((source) => <span key={source}>{source}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading ? <div className="chat-state">ARIA is retrieving verified support context...</div> : null}
        {error ? <div className="chat-state error">{error}</div> : null}
      </div>
      <FeedbackPrompt
        messages={messages}
        rating={rating}
        setRating={setRating}
        feedbackSent={feedbackSent}
        submitFeedback={submitFeedback}
        submitting={feedbackLoading}
      />
      <div className="customer-composer">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder="Ask a support question..."
        />
        <button className="primary-button icon-only" disabled={loading || !input.trim()} onClick={send} title="Send message"><Send size={17} /></button>
      </div>
    </div>
  )
}

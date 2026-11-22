import { Bot, BrainCircuit, Check, CheckCircle2, Copy, Database, Download, Plus, RefreshCw, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { ChatMessage } from '../../types'
import { FeedbackPrompt } from './FeedbackPrompt'
import type { Language } from '../../i18n'
import { translate } from '../../i18n'

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
  language: Language
  onRetry: () => void
  onNewConversation: () => void
  onDownload: () => void
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
  language,
  onRetry,
  onNewConversation,
  onDownload,
}: ChatHistoryProps) {
  const [copiedId, setCopiedId] = useState<string>()
  const lastBotId = [...messages].reverse().find((message) => message.from === 'bot')?.id

  async function copyMessage(id: string | undefined, text: string) {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(undefined), 1500)
  }

  return (
    <div className="customer-chat">
      <div className="customer-chat-header">
        <div className="ai-icon"><Bot size={18} /></div>
        <div><h2>ARIA Support</h2><span><i /> {translate(language, 'verifiedAssistant')}</span></div>
        <div className="chat-header-status"><ShieldCheck size={14} /> {translate(language, 'grounded')}</div>
        <div className="customer-chat-actions">
          <button className="icon-button" onClick={onNewConversation} aria-label="Start new conversation" title="New conversation"><Plus size={16} /></button>
          <button className="icon-button" onClick={onDownload} aria-label="Download conversation" title="Download conversation"><Download size={16} /></button>
        </div>
      </div>
      <div className="customer-message-list">
        {messages.map((message, index) => (
          <div key={message.id ?? `${message.from}-${index}`} className={`customer-bubble ${message.from}`}>
            {message.from === 'bot' && <div className="bubble-avatar"><Bot size={15} /></div>}
            <div className="customer-message-content">
              <p>{message.text}</p>
              {message.from === 'bot' && message.confidence !== undefined && (
                <div className="response-evidence">
                  <span className="evidence-chip confidence"><CheckCircle2 size={12} /> {Math.round(message.confidence * 100)}% confidence</span>
                  {message.retrievalMethod && message.retrievalMethod !== 'none' && (
                    <span className="evidence-chip retrieval"><BrainCircuit size={12} /> {message.retrievalMethod} retrieval</span>
                  )}
                  {message.generationProvider && (
                    <span className="evidence-chip provider"><Sparkles size={12} /> {message.generationProvider === 'mastra-gemini' ? 'Mastra + Gemini' : 'Local fallback'}</span>
                  )}
                  {message.sources?.map((source) => {
                    const sourceScore = message.sourceScores?.find((item) => item.title === source)
                    return (
                      <span key={source} className="evidence-chip source">
                        <Database size={12} />
                        {source}
                        {sourceScore ? ` ${Math.round(sourceScore.score * 100)}%` : ''}
                        {formatFeedbackAdjustment(sourceScore?.feedbackAdjustment)}
                      </span>
                    )
                  })}
                </div>
              )}
              {message.from === 'bot' && message.id && (
                <div className="message-actions">
                  <button className="text-action" onClick={() => void copyMessage(message.id, message.text)}><span>{copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}</span>{copiedId === message.id ? 'Copied' : 'Copy'}</button>
                  {message.id === lastBotId && <button className="text-action" onClick={onRetry}><RefreshCw size={12} /> Retry</button>}
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
          aria-label="Customer support question"
          placeholder={translate(language, 'askQuestion')}
        />
        <button className="primary-button icon-only" disabled={loading || !input.trim()} onClick={send} aria-label="Send message" title="Send message"><Send size={17} /></button>
      </div>
    </div>
  )
}

function formatFeedbackAdjustment(adjustment?: number) {
  if (!adjustment) return ''
  const signedAdjustment = Math.round(adjustment * 100)
  if (signedAdjustment === 0) return ''
  return ` learned ${signedAdjustment > 0 ? '+' : ''}${signedAdjustment}%`
}

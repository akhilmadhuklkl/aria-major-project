import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock3, Edit3, MoreHorizontal, Send } from 'lucide-react'
import type { AgentThreadMessage, Conversation } from '../../types'
import { Message } from '../Common/Message'

export interface ChatPanelProps {
  selected: Conversation
  messages: AgentThreadMessage[]
  onSendMessage: (message: string, type?: 'agent' | 'note') => void
}

export function ChatPanel({ selected, messages, onSendMessage }: ChatPanelProps) {
  const [status, setStatus] = useState<'Open' | 'Pending' | 'Resolved'>('Open')
  const [showOptions, setShowOptions] = useState(false)
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [draft, setDraft] = useState('')
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    historyRef.current?.scrollTo({
      top: historyRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length, selected.id])

  function sendDraft() {
    const text = draft.trim()
    if (!text) return
    onSendMessage(text, mode === 'note' ? 'note' : 'agent')
    setDraft('')
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className={`avatar tone-${selected.id}`}>{selected.initials}</div>
        <div><h2>{selected.customer}</h2><span>{selected.subject} | Order #{selected.orderNumber}</span></div>
        <button
          className="status-button"
          aria-label={`Conversation status: ${status}`}
          onClick={() => setStatus((current) => current === 'Open' ? 'Pending' : current === 'Pending' ? 'Resolved' : 'Open')}
          title="Cycle conversation status"
        >
          <i /> {status} <ChevronDown size={15} />
        </button>
        <div className="chat-options-anchor">
          <button className="icon-button" aria-label="Conversation options" onClick={() => setShowOptions((current) => !current)}><MoreHorizontal size={18} /></button>
          {showOptions && (
            <div className="chat-options-menu" role="status">
              <strong>{selected.priority} priority</strong>
              <span>Topic: {selected.subject}</span>
            </div>
          )}
        </div>
      </div>
      <div className="chat-history" ref={historyRef}>
        <div className="date-divider"><span>Today</span></div>
        {messages.map((message, index) => (
          message.from === 'system'
            ? <div className="system-event" key={`${selected.id}-${index}`}><Clock3 size={14} /> {message.text}</div>
            : <Message key={`${selected.id}-${index}`} from={message.from === 'customer' ? 'customer' : 'agent'} time={message.time} author={selected.customer}>{message.text}</Message>
        ))}
      </div>
      <div className="composer">
        <div className="composer-tools">
          <button className={mode === 'reply' ? 'active' : ''} onClick={() => setMode('reply')} aria-label="Reply mode"><Edit3 size={15} /> Reply</button>
          <button className={mode === 'note' ? 'active' : ''} onClick={() => setMode('note')} aria-label="Internal note mode">Internal note</button>
        </div>
        <textarea
          aria-label="Agent reply"
          placeholder={mode === 'reply' ? 'Write a reply or use the ARIA suggestion...' : 'Write an internal note for the support team...'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="composer-footer">
          <span>{mode === 'reply' ? 'Customer will receive this reply' : 'Internal note stays with the agent record'}</span>
          <button className="primary-button" aria-label="Send agent reply" disabled={!draft.trim()} onClick={sendDraft}><Send size={15} /> Send</button>
        </div>
      </div>
    </div>
  )
}

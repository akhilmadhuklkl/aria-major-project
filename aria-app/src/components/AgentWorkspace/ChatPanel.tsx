import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock3, Download, Edit3, MoreHorizontal, Send } from 'lucide-react'
import type { AgentThreadMessage, Conversation } from '../../types'
import { Message } from '../Common/Message'

export interface ChatPanelProps {
  selected: Conversation
  messages: AgentThreadMessage[]
  onSendMessage: (message: string, type?: 'agent' | 'note') => void
  onUpdateConversation: (id: number, changes: Partial<Pick<Conversation, 'status' | 'priority' | 'assignedTo' | 'tags' | 'escalated'>>) => Promise<void>
  onExport: () => Promise<void>
}

export function ChatPanel({ selected, messages, onSendMessage, onUpdateConversation, onExport }: ChatPanelProps) {
  const [status, setStatus] = useState<'Open' | 'Pending' | 'Resolved'>(selected.status ?? 'Open')
  const [showOptions, setShowOptions] = useState(false)
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [draft, setDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
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

  function addTag() {
    const tag = tagDraft.trim()
    if (!tag || (selected.tags ?? []).some((item) => item.toLowerCase() === tag.toLowerCase())) return
    void onUpdateConversation(selected.id, { tags: [...(selected.tags ?? []), tag].slice(0, 8) })
    setTagDraft('')
  }

  function removeTag(tagToRemove: string) {
    void onUpdateConversation(selected.id, { tags: (selected.tags ?? []).filter((tag) => tag !== tagToRemove) })
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className={`avatar tone-${selected.id}`}>{selected.initials}</div>
        <div><h2>{selected.customer}</h2><span>{selected.subject} | Order #{selected.orderNumber}</span></div>
        <button
          className="status-button"
          aria-label={`Conversation status: ${status}`}
          onClick={() => {
            const next = status === 'Open' ? 'Pending' : status === 'Pending' ? 'Resolved' : 'Open'
            setStatus(next)
            void onUpdateConversation(selected.id, { status: next })
          }}
          title="Cycle conversation status"
        >
          <i /> {status} <ChevronDown size={15} />
        </button>
        <div className="chat-options-anchor">
          <button className="icon-button" aria-label="Conversation options" onClick={() => setShowOptions((current) => !current)}><MoreHorizontal size={18} /></button>
          {showOptions && (
            <div className="chat-options-menu" role="status">
              <button onClick={() => { setShowOptions(false); void onExport() }}><Download size={14} /> Download conversation</button>
              <button onClick={() => void onUpdateConversation(selected.id, { priority: selected.priority === 'High' ? 'Normal' : 'High' })}>{selected.priority} priority (toggle)</button>
              <label>Assign to<select value={selected.assignedTo ?? ''} onChange={(event) => void onUpdateConversation(selected.id, { assignedTo: event.target.value || undefined })}><option value="">Unassigned</option><option>Akhil</option><option>Support Team</option></select></label>
              <button onClick={() => void onUpdateConversation(selected.id, { escalated: !selected.escalated })}>{selected.escalated ? 'Remove escalation' : 'Escalate conversation'}</button>
              <div className="conversation-tags-editor">
                <span>Tags</span>
                <div className="conversation-tags">{(selected.tags ?? []).map((tag) => <button key={tag} type="button" className="conversation-tag" onClick={() => removeTag(tag)} title={`Remove ${tag}`}>{tag} x</button>)}</div>
                <div className="tag-entry"><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag() } }} placeholder="Add a tag" aria-label="Add conversation tag" /><button type="button" onClick={addTag} disabled={!tagDraft.trim()} aria-label="Add conversation tag">Add</button></div>
              </div>
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

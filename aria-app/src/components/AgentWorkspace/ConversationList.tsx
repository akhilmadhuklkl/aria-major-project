import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Conversation } from '../../types'
import { conversations } from '../../constants'

export interface ConversationListProps {
  selected: Conversation
  onSelect: (conversation: Conversation) => void
  searchQuery: string
}

export function ConversationList({ selected, onSelect, searchQuery }: ConversationListProps) {
  const [queue, setQueue] = useState<'mine' | 'unassigned'>('mine')
  const [showNewNotice, setShowNewNotice] = useState(false)
  const visibleConversations = useMemo(() => {
    const base = queue === 'mine' ? conversations : conversations.filter((conversation) => conversation.priority === 'Normal').slice(0, 3)
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) return base

    return base.filter((conversation) => [
      conversation.customer,
      conversation.subject,
      conversation.preview,
      conversation.priority,
    ].some((value) => value.toLowerCase().includes(normalizedQuery)))
  }, [queue, searchQuery])

  return (
    <div className="queue-panel">
      <div className="panel-heading">
        <div><h2>Open conversations</h2><span>5 need attention</span></div>
        <button
          className="icon-button"
          aria-label="New conversation"
          title="New conversation"
          onClick={() => setShowNewNotice((current) => !current)}
        >
          <Plus size={18} />
        </button>
      </div>
      {showNewNotice && <div className="queue-notice">New support conversations are created from the Customer Chat workflow.</div>}
      <div className="queue-tabs">
        <button className={queue === 'mine' ? 'active' : ''} onClick={() => setQueue('mine')} aria-label="Mine conversations">Mine <b aria-hidden="true">5</b></button>
        <button className={queue === 'unassigned' ? 'active' : ''} onClick={() => setQueue('unassigned')} aria-label="Unassigned conversations">Unassigned <b aria-hidden="true">3</b></button>
      </div>
      <div className="conversation-list">
        {visibleConversations.map((conversation) => (
          <button
            key={conversation.id}
            className={`conversation-row ${selected.id === conversation.id ? 'selected' : ''}`}
            onClick={() => onSelect(conversation)}
            aria-label={`${conversation.customer}, ${conversation.subject}`}
          >
            <div className={`avatar tone-${conversation.id}`}>{conversation.initials}</div>
            <div className="conversation-copy">
              <div><strong>{conversation.customer}</strong><time>{conversation.time}</time></div>
              <span className="subject-line">{conversation.subject}</span>
              <small>{conversation.preview}</small>
            </div>
            {conversation.unread && <i className="unread-dot" />}
          </button>
        ))}
        {visibleConversations.length === 0 && (
          <div className="queue-empty">No conversations match "{searchQuery}".</div>
        )}
      </div>
    </div>
  )
}


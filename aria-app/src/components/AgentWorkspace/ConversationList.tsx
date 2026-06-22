import { Plus } from 'lucide-react'
import type { Conversation } from '../../types'
import { conversations } from '../../constants'

export interface ConversationListProps {
  selected: Conversation
  onSelect: (conversation: Conversation) => void
}

export function ConversationList({ selected, onSelect }: ConversationListProps) {
  return (
    <div className="queue-panel">
      <div className="panel-heading">
        <div><h2>Open conversations</h2><span>5 need attention</span></div>
        <button className="icon-button" title="New conversation"><Plus size={18} /></button>
      </div>
      <div className="queue-tabs"><button className="active">Mine <b>5</b></button><button>Unassigned <b>3</b></button></div>
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            className={`conversation-row ${selected.id === conversation.id ? 'selected' : ''}`}
            onClick={() => onSelect(conversation)}
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
      </div>
    </div>
  )
}

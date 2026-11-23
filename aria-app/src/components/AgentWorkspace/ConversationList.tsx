import { useMemo, useState } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import type { Conversation, ConversationQueueCounts } from '../../types'

export interface ConversationListProps {
  selected: Conversation
  conversations: Conversation[]
  onSelect: (conversation: Conversation) => void
  searchQuery: string
  onUpdateConversation: (id: number, changes: Partial<Pick<Conversation, 'status' | 'priority' | 'assignedTo' | 'tags' | 'escalated'>>) => Promise<void>
  onLoadMore: () => Promise<void>
  conversationHasMore: boolean
  conversationLoading: boolean
  queueCounts: ConversationQueueCounts
}

export function ConversationList({ selected, conversations, onSelect, searchQuery, onLoadMore, conversationHasMore, conversationLoading, queueCounts }: ConversationListProps) {
  const [queue, setQueue] = useState<'mine' | 'unassigned'>('mine')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showNewNotice, setShowNewNotice] = useState(false)
  const visibleConversations = useMemo(() => {
    const base = queue === 'mine' ? conversations.filter((conversation) => conversation.assignedTo) : conversations.filter((conversation) => !conversation.assignedTo)
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return base.filter((conversation) => {
      if (statusFilter !== 'all' && conversation.status !== statusFilter) return false
      if (priorityFilter !== 'all' && conversation.priority !== priorityFilter) return false
      if (!normalizedQuery) return true
      return [conversation.customer, conversation.subject, conversation.preview, conversation.priority, ...(conversation.tags ?? [])]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [conversations, priorityFilter, queue, searchQuery, statusFilter])

  return (
    <div className="queue-panel">
      <div className="panel-heading">
        <div><h2>Open conversations</h2><span>{queueCounts.attention} need attention</span></div>
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
        <button className={queue === 'mine' ? 'active' : ''} onClick={() => setQueue('mine')} aria-label="Mine conversations">Mine <b aria-hidden="true">{queueCounts.mine}</b></button>
        <button className={queue === 'unassigned' ? 'active' : ''} onClick={() => setQueue('unassigned')} aria-label="Unassigned conversations">Unassigned <b aria-hidden="true">{queueCounts.unassigned}</b></button>
      </div>
      <div className="queue-filters">
        <SlidersHorizontal size={14} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option><option value="Open">Open</option><option value="Pending">Pending</option><option value="Resolved">Resolved</option>
        </select>
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
          <option value="all">All priorities</option><option value="High">High</option><option value="Normal">Normal</option>
        </select>
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
              <div className="conversation-meta"><span>{conversation.status ?? 'Open'}</span>{conversation.escalated && <span className="escalated-tag">Escalated</span>}</div>
            </div>
            {conversation.unread && <i className="unread-dot" />}
          </button>
        ))}
        {visibleConversations.length === 0 && (
          <div className="queue-empty">No conversations match "{searchQuery}".</div>
        )}
        {conversationHasMore && !searchQuery.trim() && (
          <button className="queue-load-more" onClick={() => void onLoadMore()} disabled={conversationLoading}>
            {conversationLoading ? 'Loading conversations...' : 'Load more conversations'}
          </button>
        )}
      </div>
    </div>
  )
}


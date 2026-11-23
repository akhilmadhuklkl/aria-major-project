import type { AgentThreadMessage, AuthUser, Conversation, ConversationQueueCounts } from '../../types'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { AIPanel } from './AIPanel'

export interface AgentWorkspaceProps {
  selected: Conversation
  conversations: Conversation[]
  onSelect: (conversation: Conversation) => void
  messages: AgentThreadMessage[]
  onSendMessage: (message: string, type?: 'agent' | 'note') => void
  searchQuery: string
  suggestion: string
  setSuggestion: (value: string) => void
  status: string
  onAction: (action: 'accepted' | 'edited' | 'rejected') => void
  regenerate: () => void
  actionLoading: boolean
  onUpdateConversation: (id: number, changes: Partial<Pick<Conversation, 'status' | 'priority' | 'assignedTo' | 'tags' | 'escalated'>>) => Promise<void>
  onExport: () => Promise<void>
  onLoadMore: () => Promise<void>
  conversationHasMore: boolean
  conversationLoading: boolean
  queueCounts: ConversationQueueCounts
  supportAgents: AuthUser[]
}

export function AgentWorkspace({
  selected,
  conversations,
  onSelect,
  messages,
  onSendMessage,
  searchQuery,
  suggestion,
  setSuggestion,
  status,
  onAction,
  regenerate,
  actionLoading,
  onUpdateConversation,
  onExport,
  onLoadMore,
  conversationHasMore,
  conversationLoading,
  queueCounts,
  supportAgents,
}: AgentWorkspaceProps) {
  return (
    <section className="workspace-grid">
      <ConversationList selected={selected} conversations={conversations} onSelect={onSelect} searchQuery={searchQuery} onUpdateConversation={onUpdateConversation} onLoadMore={onLoadMore} conversationHasMore={conversationHasMore} conversationLoading={conversationLoading} queueCounts={queueCounts} />
      <ChatPanel key={selected.id} selected={selected} messages={messages} onSendMessage={onSendMessage} onUpdateConversation={onUpdateConversation} onExport={onExport} supportAgents={supportAgents} />
      <AIPanel
        suggestion={suggestion}
        setSuggestion={setSuggestion}
        status={status}
        onAction={onAction}
        regenerate={regenerate}
        actionLoading={actionLoading}
      />
    </section>
  )
}

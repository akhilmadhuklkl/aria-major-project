import type { AgentThreadMessage, Conversation } from '../../types'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { AIPanel } from './AIPanel'

export interface AgentWorkspaceProps {
  selected: Conversation
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
}

export function AgentWorkspace({
  selected,
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
}: AgentWorkspaceProps) {
  return (
    <section className="workspace-grid">
      <ConversationList selected={selected} onSelect={onSelect} searchQuery={searchQuery} onUpdateConversation={onUpdateConversation} />
      <ChatPanel key={selected.id} selected={selected} messages={messages} onSendMessage={onSendMessage} onUpdateConversation={onUpdateConversation} />
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

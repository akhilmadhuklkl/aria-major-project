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
}: AgentWorkspaceProps) {
  return (
    <section className="workspace-grid">
      <ConversationList selected={selected} onSelect={onSelect} searchQuery={searchQuery} />
      <ChatPanel key={selected.id} selected={selected} messages={messages} onSendMessage={onSendMessage} />
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

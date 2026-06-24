import type { Conversation } from '../../types'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { AIPanel } from './AIPanel'

export interface AgentWorkspaceProps {
  selected: Conversation
  onSelect: (conversation: Conversation) => void
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
  suggestion,
  setSuggestion,
  status,
  onAction,
  regenerate,
  actionLoading,
}: AgentWorkspaceProps) {
  return (
    <section className="workspace-grid">
      <ConversationList selected={selected} onSelect={onSelect} />
      <ChatPanel selected={selected} />
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

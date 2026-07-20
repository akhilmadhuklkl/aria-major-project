import { useState } from 'react'
import { Activity, BrainCircuit, Check, Edit3, FileText, MessageCircle, MoreHorizontal, RefreshCw, Sparkles, X } from 'lucide-react'
import { Source } from '../Common/Source'

export interface AIPanelProps {
  suggestion: string
  setSuggestion: (value: string) => void
  status: string
  onAction: (action: 'accepted' | 'edited' | 'rejected') => void
  regenerate: () => void
  actionLoading: boolean
}

export function AIPanel({ suggestion, setSuggestion, status, onAction, regenerate, actionLoading }: AIPanelProps) {
  const [showOptions, setShowOptions] = useState(false)

  return (
    <aside className="ai-panel">
      <div className="ai-title">
        <div><div className="ai-icon"><Sparkles size={17} /></div><div><h2>ARIA assistant</h2><span>Mastra agent preview</span></div></div>
        <div className="chat-options-anchor">
          <button className="icon-button" aria-label="ARIA assistant options" onClick={() => setShowOptions((current) => !current)}><MoreHorizontal size={17} /></button>
          {showOptions && (
            <div className="chat-options-menu" role="status">
              <strong>Assistant actions</strong>
              <span>Accept/Edit send a reply. Regenerate refreshes the draft. Reject stores a learning signal.</span>
            </div>
          )}
        </div>
      </div>
      <div className="confidence-row">
        <div><span>Response confidence</span><strong>92%</strong></div>
        <div className="confidence-track"><i /></div>
      </div>
      <div className="suggestion-block">
        <div className="section-label"><span>Suggested response</span><small>{status}</small></div>
        <textarea aria-label="Suggested response" value={suggestion} disabled={actionLoading} onChange={(event) => setSuggestion(event.target.value)} />
      </div>
      <div className="sources-block">
        <div className="section-label"><span>Sources used</span><small>3 references</small></div>
        <Source icon={FileText} title="Refund and return policy" detail="Section 4.2 - Refund timelines" />
        <Source icon={BrainCircuit} title="Payment provider guide" detail="Bank processing windows" />
        <Source icon={MessageCircle} title="Conversation memory" detail="2 relevant past interactions" />
      </div>
      <div className="ai-actions">
        <button className="primary-button" disabled={actionLoading} title="Send the current ARIA suggestion to the customer and save it as accepted." onClick={() => onAction('accepted')}><Check size={16} /> Accept</button>
        <button className="secondary-button" disabled={actionLoading} title="Send the edited text from the suggestion box and save it as an agent correction." onClick={() => onAction('edited')}><Edit3 size={16} /> Edit & send</button>
        <button className="secondary-button" disabled={actionLoading} title="Refresh the suggested response using the selected conversation context." onClick={regenerate}><RefreshCw size={16} /> Regenerate</button>
        <button className="reject-button" disabled={actionLoading} title="Reject the suggestion and save a negative learning signal without sending it." onClick={() => onAction('rejected')}><X size={16} /> Reject</button>
      </div>
      <div className="action-status" role="status">{status}</div>
      <div className="action-guide">
        <strong>Action meaning</strong>
        <span>Accept sends the suggestion. Edit & send sends your edited text. Regenerate refreshes the draft. Reject records that the suggestion was not useful.</span>
      </div>
      <div className="learning-note"><Activity size={16} /><p><strong>Adaptive learning active</strong><span>Agent actions improve future retrieval and response scoring.</span></p></div>
    </aside>
  )
}

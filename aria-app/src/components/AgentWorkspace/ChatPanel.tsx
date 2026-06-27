import { ChevronDown, Clock3, Edit3, MoreHorizontal, Send } from 'lucide-react'
import type { Conversation } from '../../types'
import { Message } from '../Common/Message'

export interface ChatPanelProps {
  selected: Conversation
}

export function ChatPanel({ selected }: ChatPanelProps) {
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className={`avatar tone-${selected.id}`}>{selected.initials}</div>
        <div><h2>{selected.customer}</h2><span>{selected.subject} | Order #AR-20491</span></div>
        <button className="status-button"><i /> Open <ChevronDown size={15} /></button>
        <button className="icon-button"><MoreHorizontal size={18} /></button>
      </div>
      <div className="chat-history">
        <div className="date-divider"><span>Today</span></div>
        <Message from="customer" time="10:12 AM">
          Hi, I received an email saying my refund was approved, but it still has not appeared in my account. Can you check what is happening?
        </Message>
        <div className="system-event"><Clock3 size={14} /> ARIA reviewed 3 knowledge sources and prepared a response</div>
        <Message from="agent" time="10:14 AM">
          Thanks for reaching out, Maya. I am checking the refund status and expected processing time for you now.
        </Message>
        <Message from="customer" time="10:15 AM">Thank you. I need to know when I should expect it.</Message>
      </div>
      <div className="composer">
        <div className="composer-tools"><button><Edit3 size={15} /> Reply</button><button>Internal note</button></div>
        <textarea placeholder="Write a reply or use the ARIA suggestion..." />
        <div className="composer-footer"><span>Customer will receive this reply</span><button className="primary-button"><Send size={15} /> Send</button></div>
      </div>
    </div>
  )
}

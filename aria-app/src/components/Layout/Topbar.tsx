import { Bell, Search } from 'lucide-react'
import type { View } from '../../types'

export interface TopbarProps {
  view: View
}

export function Topbar({ view }: TopbarProps) {
  const names: Record<View, string> = {
    inbox: 'Agent workspace',
    customer: 'Customer chat',
    knowledge: 'Knowledge base',
    analytics: 'Support analytics',
  }

  return (
    <header className="topbar">
      <div>
        <h1>{names[view]}</h1>
        <span className="online-status"><i /> AI services operational</span>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Search size={17} />
          <input aria-label="Search conversations" placeholder="Search conversations" />
        </label>
        <button className="icon-button" aria-label="Notifications" title="Notifications"><Bell size={18} /><i /></button>
      </div>
    </header>
  )
}

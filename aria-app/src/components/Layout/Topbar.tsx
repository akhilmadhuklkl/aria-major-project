import { useState } from 'react'
import { Bell, Search } from 'lucide-react'
import type { View } from '../../types'

export interface TopbarProps {
  view: View
  searchQuery: string
  onSearch: (value: string) => void
  searchEnabled: boolean
  searchPlaceholder: string
}

export function Topbar({ view, searchQuery, onSearch, searchEnabled, searchPlaceholder }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
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
        {searchEnabled && (
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
            />
          </label>
        )}
        <div className="topbar-popover-anchor">
          <button
            className="icon-button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setShowNotifications((current) => !current)}
          >
            <Bell size={18} /><i />
          </button>
          {showNotifications && (
            <div className="topbar-popover" role="status">
              <strong>System ready</strong>
              <span>Backend, SQLite, retrieval, and AI connection are operational.</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

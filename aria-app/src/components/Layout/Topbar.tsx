import { useEffect, useState } from 'react'
import { Bell, Search } from 'lucide-react'
import type { Notification, View } from '../../types'
import { api } from '../../api'
import type { Language } from '../../i18n'
import { translate } from '../../i18n'

export interface TopbarProps {
  view: View
  searchQuery: string
  onSearch: (value: string) => void
  searchEnabled: boolean
  searchPlaceholder: string
  language: Language
}

export function Topbar({ view, searchQuery, onSearch, searchEnabled, searchPlaceholder, language }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  useEffect(() => {
    const loadNotifications = () => { void api.getNotifications().then(setNotifications).catch(() => undefined) }
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 30000)
    return () => window.clearInterval(interval)
  }, [])
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const names: Record<View, string> = {
    inbox: translate(language, 'inbox'),
    customer: translate(language, 'customer'),
    knowledge: translate(language, 'knowledge'),
    analytics: translate(language, 'analytics'),
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
            <Bell size={18} />{unreadCount > 0 && <i />}
          </button>
          {showNotifications && (
            <div className="topbar-popover notifications-popover" role="status">
              <div className="notification-heading"><strong>Notifications</strong><button onClick={() => { void api.markAllNotificationsRead(); setNotifications((items) => items.map((item) => ({ ...item, readAt: new Date().toISOString() }))) }}>Mark all read</button></div>
              {notifications.length === 0 ? <span>System ready. No new notifications.</span> : notifications.slice(0, 5).map((item) => <button className={`notification-item ${item.readAt ? 'read' : ''}`} key={item.id} onClick={() => { if (!item.readAt) { void api.markNotificationRead(item.id); setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification)) } }}><strong>{item.title}</strong><span>{item.message}</span></button>)}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

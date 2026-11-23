import { useEffect, useState } from 'react'
import { Bell, RefreshCw, Search } from 'lucide-react'
import type { Notification, SystemStatus, View } from '../../types'
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
  systemStatus?: SystemStatus
  healthUnavailable: boolean
  onRefreshStatus: () => Promise<void>
}

export function Topbar({ view, searchQuery, onSearch, searchEnabled, searchPlaceholder, language, systemStatus, healthUnavailable, onRefreshStatus }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationError, setNotificationError] = useState('')
  const [readingNotification, setReadingNotification] = useState<number | 'all' | null>(null)
  useEffect(() => {
    const loadNotifications = () => { void api.getNotifications().then(setNotifications).catch(() => undefined) }
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 30000)
    return () => window.clearInterval(interval)
  }, [])
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const notificationKindLabels: Record<string, string> = {
    escalation: 'Escalation',
    feedback: 'Feedback',
    knowledge: 'Knowledge',
    conversation: 'Conversation',
    'agent-action': 'Agent action',
  }
  const formatNotificationTime = (createdAt: string) => new Date(createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })

  async function markAllRead() {
    if (readingNotification) return
    setReadingNotification('all')
    setNotificationError('')
    try {
      await api.markAllNotificationsRead()
      setNotifications((items) => items.map((item) => ({ ...item, readAt: new Date().toISOString() })))
    } catch {
      setNotificationError('Could not update notifications. Please try again.')
    } finally {
      setReadingNotification(null)
    }
  }

  async function markRead(id: number) {
    if (readingNotification) return
    setReadingNotification(id)
    setNotificationError('')
    try {
      await api.markNotificationRead(id)
      setNotifications((items) => items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
    } catch {
      setNotificationError('Could not update this notification. Please try again.')
    } finally {
      setReadingNotification(null)
    }
  }
  const names: Record<View, string> = {
    inbox: translate(language, 'inbox'),
    customer: translate(language, 'customer'),
    knowledge: translate(language, 'knowledge'),
    analytics: translate(language, 'analytics'),
  }
  const serviceState = healthUnavailable ? 'degraded' : !systemStatus ? 'checking' : systemStatus.backend.status === 'operational' ? 'operational' : 'degraded'
  const serviceLabel = healthUnavailable ? 'Service unavailable' : serviceState === 'checking' ? 'Checking AI services' : serviceState === 'operational' ? 'AI services operational' : 'AI services degraded'
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  async function refreshStatus() {
    if (refreshingStatus) return
    setRefreshingStatus(true)
    try {
      await onRefreshStatus()
    } finally {
      setRefreshingStatus(false)
    }
  }

  return (
    <header className="topbar">
      <div>
        <h1>{names[view]}</h1>
        <button className={`online-status status-refresh ${serviceState}`} onClick={() => void refreshStatus()} disabled={refreshingStatus} title="Refresh service status" aria-label="Refresh service status"><i /> {refreshingStatus ? 'Checking services...' : serviceLabel}<RefreshCw size={11} /></button>
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
            <div className="topbar-popover notifications-popover" role="status" aria-live="polite">
              <div className="notification-heading"><strong>Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}</strong><button disabled={unreadCount === 0 || readingNotification !== null} onClick={() => void markAllRead()}>{readingNotification === 'all' ? 'Updating...' : 'Mark all read'}</button></div>
              {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
              {notifications.length === 0 ? <span>System ready. No new notifications.</span> : notifications.slice(0, 5).map((item) => <button className={`notification-item ${item.readAt ? 'read' : ''}`} key={item.id} disabled={readingNotification !== null} onClick={() => { if (!item.readAt) void markRead(item.id) }}><strong>{item.title}</strong><span>{item.message}</span><small>{notificationKindLabels[item.kind] ?? 'System'} · {formatNotificationTime(item.createdAt)}{!item.readAt ? ' · Unread' : ''}</small></button>)}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

import { CircleHelp, MoreHorizontal, Settings, Sparkles } from 'lucide-react'
import type { View } from '../../types'
import { navItems } from '../../constants'

export interface SidebarProps {
  view: View
  onChange: (view: View) => void
  onHelp: () => void
  onSettings: () => void
}

export function Sidebar({ view, onChange, onHelp, onSettings }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand" aria-label="ARIA">
        <div className="brand-mark"><Sparkles size={19} /></div>
        <span>ARIA</span>
      </div>
      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={19} />
              <span>{item.label}</span>
              {item.id === 'inbox' && <b aria-hidden="true">5</b>}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={onHelp} aria-label="Help" title="Help"><CircleHelp size={19} /><span>Help</span></button>
        <button className="nav-item" onClick={onSettings} aria-label="Settings" title="Settings"><Settings size={19} /><span>Settings</span></button>
        <div className="profile-mini">
          <div className="avatar agent">AM</div>
          <div><strong>Akhil Madhu</strong><span>Support agent</span></div>
          <MoreHorizontal size={18} />
        </div>
      </div>
    </aside>
  )
}

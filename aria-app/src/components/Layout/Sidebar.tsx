import { CircleHelp, KeyRound, LogOut, Settings, Sparkles } from 'lucide-react'
import type { AuthUser, View } from '../../types'
import type { Language } from '../../i18n'
import { translate } from '../../i18n'
import { navItems } from '../../constants'

export interface SidebarProps {
  view: View
  onChange: (view: View) => void
  onHelp: () => void
  onSettings: () => void
  user?: AuthUser
  onLogin: () => void
  onLogout: () => void
  language: Language
  onLanguageChange: (language: Language) => void
}

export function Sidebar({ view, onChange, onHelp, onSettings, user, onLogin, onLogout, language, onLanguageChange }: SidebarProps) {
  const visibleNavItems = navItems.filter((item) => !user || user.role !== 'customer' || item.id === 'customer')

  return (
    <aside className="sidebar">
      <div className="brand" aria-label="ARIA">
        <div className="brand-mark"><Sparkles size={19} /></div>
        <span>ARIA</span>
      </div>
      <nav className="nav-list">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-label={translate(language, item.id)}
              title={translate(language, item.id)}
            >
              <Icon size={19} />
              <span>{translate(language, item.id)}</span>
              {item.id === 'inbox' && <b aria-hidden="true">5</b>}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={onHelp} aria-label={translate(language, 'help')} title={translate(language, 'help')}><CircleHelp size={19} /><span>{translate(language, 'help')}</span></button>
        {user?.role !== 'customer' && <button className="nav-item" onClick={onSettings} aria-label={translate(language, 'settings')} title={translate(language, 'settings')}><Settings size={19} /><span>{translate(language, 'settings')}</span></button>}
        <label className="language-picker"><span>{translate(language, 'language')}</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} aria-label={translate(language, 'language')}><option value="en">English</option><option value="hi">हिन्दी</option><option value="es">Español</option></select></label>
        {user ? (
          <div className="profile-mini">
            <div className="avatar agent">{user.displayName.slice(0, 2).toUpperCase()}</div>
            <div><strong>{user.displayName}</strong><span>{user.role.replace('_', ' ')}</span></div>
            <button className="profile-action" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        ) : (
          <button className="nav-item sign-in-link" onClick={onLogin} aria-label="Sign in"><KeyRound size={18} /><span>Sign in</span></button>
        )}
      </div>
    </aside>
  )
}

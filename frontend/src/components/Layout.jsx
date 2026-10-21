import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { authToken, setToken } from '../api.js'

const nav = [
  { to: '/files', label: 'Файлы', icon: '📁' },
  { to: '/gallery', label: 'Галерея', icon: '🖼️' },
  { to: '/audio', label: 'Аудиo', icon: '🎵' },
  { to: '/chat', label: 'Чат', icon: '💬' },
  { to: '/notes', label: 'Заметки', icon: '📝' },
  { to: '/vault', label: 'Хранилище', icon: '🔐' },
  { to: '/snippets', label: 'Сниппеты', icon: '⌨️' },
  { to: '/read', label: 'Читалка', icon: '📖' },
  { to: '/settings', label: 'Настройки', icon: '⚙️' }
]

export default function Layout({ me, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const authed = !!authToken()

  useEffect(() => {
    setOpen(false)
  }, [window.location.pathname])

  const out = () => {
    setToken(null)
    onLogout && onLogout()
    navigate('/login')
  }

  return (
    <div className="app">
      <button className="burger btn btn-ghost" onClick={() => setOpen(!open)} aria-label="Меню">
        ☰
      </button>
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="logo">Hub</div>
        {authed && (
          <nav className="nav">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                <span className="icon">{n.icon}</span>
                <span>{n.label}</span>
              </NavLink>
            ))}
            <button className="nav-item btn-logout" onClick={out}>
              <span className="icon">🚪</span>
              <span>Выход</span>
            </button>
          </nav>
        )}
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}

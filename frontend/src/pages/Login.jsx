import React, { useState } from 'react'
import { api, setToken } from '../api.js'

export default function Login({ onAuthed }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body =
        tab === 'login' ? { email, password } : { email, password, invite_code: invite }
      const data = await api('POST', tab === 'login' ? '/api/auth/login' : '/api/auth/register', body)
      setToken(data.token)
      onAuthed(data.token, data.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card card" onSubmit={submit}>
        <h1>Hub</h1>
        <div className="tabs">
          <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>
            Вход
          </button>
          <button type="button" className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>
            Регистрация
          </button>
        </div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {tab === 'register' && (
          <input placeholder="Код приглашения" value={invite} onChange={(e) => setInvite(e.target.value)} required />
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" disabled={busy}>
          {tab === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>
    </div>
  )
}

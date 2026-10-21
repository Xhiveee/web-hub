import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Settings({ me, setMe }) {
  const [tg, setTg] = useState(me && me.tg_chat_id != null ? String(me.tg_chat_id) : '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (me && me.tg_chat_id != null) setTg(String(me.tg_chat_id))
  }, [me])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      const body = { tg_chat_id: tg ? Number(tg) : null }
      await api('PATCH', '/api/auth/me', body)
      const m = await api('GET', '/api/auth/me')
      setMe(m)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <div className="page-head"><h2>Настройки</h2></div>
      {error && <div className="error">{error}</div>}
      <div className="card form">
        <div className="kv"><span>Email:</span><span>{me && me.email}</span></div>
        <div className="kv"><span>AI:</span><span>{me && me.ai_enabled ? 'включён' : 'отключён (нужен HUB_AI_API_KEY у администратора)'}</span></div>
      </div>
      <form className="card form" onSubmit={save}>
        <div className="form-row">
          <label>Telegram Chat ID</label>
          <input placeholder="ID чата" value={tg} onChange={(e) => setTg(e.target.value)} />
        </div>
        <div className="row-sub">Получить ID можно у бота @userinfobot</div>
        <div className="form-actions">
          <button className="btn btn-primary">Сохранить</button>
          {saved && <span className="row-sub">Сохранено</span>}
        </div>
      </form>
    </div>
  )
}

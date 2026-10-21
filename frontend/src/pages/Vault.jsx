import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const emptyForm = { kind: 'password', title: '', login: '', password: '', url: '', note: '', text: '' }

export default function Vault() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState({})

  const load = () => api('GET', '/api/vault').then(setItems).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const data = (f) => {
    if (f.kind === 'password') {
      return { login: f.login, password: f.password, url: f.url || undefined, note: f.note || undefined }
    }
    if (f.kind === 'link') return { url: f.url, note: f.note || undefined }
    return { text: f.text }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = { kind: form.kind, title: form.title, data: data(form) }
      if (editId) await api('PATCH', '/api/vault/' + editId, body)
      else await api('POST', '/api/vault', body)
      setForm(emptyForm)
      setEditId(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const edit = (it) => {
    setEditId(it.id)
    setForm({
      kind: it.kind,
      title: it.title,
      login: it.data.login || '',
      password: it.data.password || '',
      url: it.data.url || '',
      note: it.data.note || '',
      text: it.data.text || ''
    })
  }

  const del = async (id) => {
    try {
      await api('DELETE', '/api/vault/' + id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const cancel = () => {
    setEditId(null)
    setForm(emptyForm)
  }

  const copy = async (t) => {
    try {
      await navigator.clipboard.writeText(t)
    } catch (e) {}
  }

  const toggle = (id) => setRevealed({ ...revealed, [id]: !revealed[id] })

  const kindLabel = { password: 'Пароль', link: 'Ссылка', text: 'Заметка' }

  return (
    <div className="page">
      <div className="page-head"><h2>Хранилище</h2></div>
      {error && <div className="error">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="form-row-grid">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="password">Пароль</option>
            <option value="link">Ссылка</option>
            <option value="text">Заметка</option>
          </select>
          <input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        {form.kind === 'password' && (
          <>
            <input placeholder="Логин" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
            <input placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <input placeholder="URL (необязательно)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <input placeholder="Примечание (необязательно)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </>
        )}
        {form.kind === 'link' && (
          <>
            <input placeholder="URL" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
            <input placeholder="Примечание (необязательно)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </>
        )}
        {form.kind === 'text' && (
          <textarea placeholder="Текст" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
        )}
        <div className="form-actions">
          <button className="btn btn-primary">{editId ? 'Сохранить' : 'Добавить'}</button>
          {editId && <button type="button" className="btn" onClick={cancel}>Отмена</button>}
        </div>
      </form>
      <div className="grid">
        {items.map((it) => (
          <div className="card vault-card" key={it.id}>
            <div className="vault-head">
              <span className="badge">{kindLabel[it.kind]}</span>
              <strong>{it.title}</strong>
            </div>
            {it.kind === 'password' && (
              <div className="vault-fields">
                {revealed[it.id] ? (
                  <>
                    <div className="kv"><span>Логин:</span><span>{it.data.login}</span></div>
                    <div className="kv"><span>Пароль:</span><span>{it.data.password}</span></div>
                    <button className="btn btn-ghost" onClick={() => { copy(it.data.login); copy(it.data.password) }}>Копировать логин и пароль</button>
                    <button className="btn btn-ghost" onClick={() => toggle(it.id)}>Скрыть</button>
                  </>
                ) : (
                  <button className="btn btn-ghost" onClick={() => toggle(it.id)}>Показать</button>
                )}
              </div>
            )}
            {it.kind === 'link' && (
              <div className="vault-fields">
                <a href={it.data.url} target="_blank" rel="noreferrer">{it.data.url}</a>
                {it.data.note && <div className="row-sub">{it.data.note}</div>}
              </div>
            )}
            {it.kind === 'text' && <div className="vault-text">{it.data.text}</div>}
            <div className="row-actions">
              <button className="btn btn-ghost" onClick={() => edit(it)}>✏</button>
              <button className="btn btn-ghost danger" onClick={() => del(it.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="empty">Пусто</div>}
    </div>
  )
}

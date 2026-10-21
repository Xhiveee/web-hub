import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const emptyForm = { title: '', lang: '', code: '' }

export default function Snippets() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')

  const load = () => api('GET', '/api/snippets').then(setItems).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editId) await api('PATCH', '/api/snippets/' + editId, form)
      else await api('POST', '/api/snippets', form)
      setForm(emptyForm)
      setEditId(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const edit = (s) => {
    setEditId(s.id)
    setForm({ title: s.title, lang: s.lang, code: s.code })
  }

  const cancel = () => {
    setEditId(null)
    setForm(emptyForm)
  }

  const del = async (id) => {
    try {
      await api('DELETE', '/api/snippets/' + id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const copy = async (t) => {
    try {
      await navigator.clipboard.writeText(t)
    } catch (e) {}
  }

  return (
    <div className="split">
      <div className="split-side">
        {error && <div className="error">{error}</div>}
        <form className="card form" onSubmit={submit}>
          <input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input placeholder="Язык" value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value })} />
          <textarea placeholder="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <div className="form-actions">
            <button className="btn btn-primary">{editId ? 'Сохранить' : 'Добавить'}</button>
            {editId && <button type="button" className="btn" onClick={cancel}>Отмена</button>}
          </div>
        </form>
      </div>
      <div className="split-main">
        <div className="list">
          {items.map((s) => (
            <div className="card snippet-card" key={s.id}>
              <div className="page-head">
                <strong>{s.title}</strong>
                <div className="row-actions">
                  <button className="btn btn-ghost" onClick={() => copy(s.code)}>Копировать</button>
                  <button className="btn btn-ghost" onClick={() => edit(s)}>✏</button>
                  <button className="btn btn-ghost danger" onClick={() => del(s.id)}>🗑</button>
                </div>
              </div>
              {s.lang && <span className="badge">{s.lang}</span>}
              <pre className="snippet-code">{s.code}</pre>
            </div>
          ))}
          {items.length === 0 && <div className="empty">Нет сниппетов</div>}
        </div>
      </div>
    </div>
  )
}

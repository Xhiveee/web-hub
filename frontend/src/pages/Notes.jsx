import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const timer = useRef(null)
  const loadRef = useRef(null)

  const load = () => api('GET', '/api/notes').then(setNotes).catch((e) => setError(e.message))
  loadRef.current = load

  useEffect(() => {
    load()
  }, [])

  const open = (n) => {
    setActiveId(n.id)
    setTitle(n.title)
    setBody(n.body)
    setSaved(false)
  }

  const newNote = async () => {
    try {
      const n = await api('POST', '/api/notes', { title: 'Новая заметка', body: '' })
      load()
      open(n)
    } catch (e) {
      setError(e.message)
    }
  }

  const save = async (t, b) => {
    if (!activeId) return
    try {
      await api('PATCH', '/api/notes/' + activeId, { title: t, body: b })
      setSaved(true)
      loadRef.current()
    } catch (e) {
      setError(e.message)
    }
  }

  const saveOnBlur = () => {
    setSaved(false)
    save(title, body)
  }

  const onChange = (setter, val) => {
    setter(val)
    setSaved(false)
  }

  const autosave = (t, b) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(t, b), 1500)
  }

  const onTitleChange = (e) => {
    onChange(setTitle, e.target.value)
    autosave(e.target.value, body)
  }

  const onBodyChange = (e) => {
    onChange(setBody, e.target.value)
    autosave(title, e.target.value)
  }

  const onTitleBlur = () => {
    if (timer.current) clearTimeout(timer.current)
    saveOnBlur()
  }

  const onBodyBlur = () => {
    if (timer.current) clearTimeout(timer.current)
    saveOnBlur()
  }

  const del = async (id) => {
    try {
      await api('DELETE', '/api/notes/' + id)
      if (activeId === id) setActiveId(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="split">
      <div className="split-side">
        <button className="btn btn-primary" onClick={newNote}>Новая заметка</button>
        <div className="list">
          {notes.map((n) => (
            <div key={n.id} className={'row card' + (activeId === n.id ? ' selected' : '')} onClick={() => open(n)}>
              <div className="row-main">
                <div className="row-name">{n.title}</div>
                <div className="row-sub">{new Date(n.updated_at).toLocaleString()}</div>
              </div>
              <div className="row-actions">
                <button className="btn btn-ghost danger" onClick={(e) => { e.stopPropagation(); del(n.id) }}>🗑</button>
              </div>
            </div>
          ))}
          {notes.length === 0 && <div className="empty">Нет заметок</div>}
        </div>
      </div>
      <div className="split-main">
        {error && <div className="error">{error}</div>}
        {activeId ? (
          <div className="editor card">
            <input className="editor-title" value={title} onChange={onTitleChange} onBlur={onTitleBlur} />
            <textarea className="editor-body" value={body} onChange={onBodyChange} onBlur={onBodyBlur} placeholder="Текст заметки…" />
            <div className="editor-foot">
              <span className="row-sub">{saved ? 'Сохранено' : ''}</span>
              <button className="btn btn-primary" onClick={() => save(title, body)}>Сохранить</button>
            </div>
          </div>
        ) : (
          <div className="empty">Выберите заметку</div>
        )}
      </div>
    </div>
  )
}

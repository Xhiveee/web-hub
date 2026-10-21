import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export default function Chat({ me }) {
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showList, setShowList] = useState(window.innerWidth > 640)
  const msgEnd = useRef(null)

  const load = async () => {
    try {
      const list = await api('GET', '/api/chat/conversations')
      setConvs(list)
      if (list.length > 0) setActive(list[0].id)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!active) return
    api('GET', '/api/chat/conversations/' + active + '/messages').then(setMessages).catch((e) => setError(e.message))
  }, [active])

  useEffect(() => {
    if (msgEnd.current) msgEnd.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const newChat = async () => {
    try {
      const c = await api('POST', '/api/chat/conversations', { title: 'Новый чат' })
      setConvs([c].concat(convs))
      setActive(c.id)
      setShowList(window.innerWidth > 640)
    } catch (e) {
      setError(e.message)
    }
  }

  const delConv = async (id) => {
    try {
      await api('DELETE', '/api/chat/conversations/' + id)
      const rest = convs.filter((c) => c.id !== id)
      setConvs(rest)
      if (active === id) setActive(rest.length ? rest[0].id : null)
    } catch (e) {
      setError(e.message)
    }
  }

  const send = async (e) => {
    e.preventDefault()
    if (!input.trim() || !active || busy) return
    const content = input.trim()
    setInput('')
    setBusy(true)
    setMessages(messages.concat([{ role: 'user', content }]))
    try {
      const r = await api('POST', '/api/chat/conversations/' + active + '/messages', { content })
      setMessages(messages.concat([{ role: 'user', content }, { role: 'assistant', content: r.content, files: r.files || [] }]))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chat-layout">
      <div className={'chat-side' + (showList ? ' open' : '')}>
        <button className="btn btn-primary" onClick={newChat}>Новый чат</button>
        <div className="chat-conv-list">
          {convs.map((c) => (
            <div key={c.id} className={'chat-conv' + (active === c.id ? ' active' : '')} onClick={() => { setActive(c.id); setShowList(false) }}>
              <span className="chat-conv-title">{c.title}</span>
              <button className="btn btn-ghost danger" onClick={(e) => { e.stopPropagation(); delConv(c.id) }}>🗑</button>
            </div>
          ))}
          {convs.length === 0 && <div className="empty">Нет чатов</div>}
        </div>
      </div>
      <div className="chat-main">
        {me && me.ai_enabled === false && (
          <div className="notice">AI отключён. Администратор должен задать HUB_AI_API_KEY.</div>
        )}
        {error && <div className="error">{error}</div>}
        <div className="chat-messages">
          {messages.filter((m) => m.role === 'tool').map((m, i) => (
            <div key={'t' + i} className="tool-chip">использован инструмент {m.tool_name}</div>
          ))}
          {messages.filter((m) => m.role !== 'tool').map((m, i) => (
            <div key={i} className={'msg ' + m.role}>
              <div className="msg-body">
                <div className="msg-text">{m.content}</div>
                {m.files && m.files.length > 0 && (
                  <div className="msg-files">
                    {m.files.map((f) => (
                      <a key={f.id} href={'/api/files/' + f.id + '/download?token=' + encodeURIComponent(localStorage.getItem('wt') || '')} target="_blank" rel="noreferrer">
                        📄 {f.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="msg assistant"><div className="msg-body">Печатает…</div></div>}
          <div ref={msgEnd} />
        </div>
        <form className="chat-input" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Сообщение…" disabled={!active || busy} />
          <button className="btn btn-primary" disabled={!active || busy}>➤</button>
        </form>
        <button className="btn btn-ghost chat-toggle" onClick={() => setShowList(!showList)}>Чаты</button>
      </div>
    </div>
  )
}

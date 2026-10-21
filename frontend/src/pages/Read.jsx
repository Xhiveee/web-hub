import React, { useState } from 'react'
import { api } from '../api.js'

export default function Read() {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await api('POST', '/api/read', { url })
      setText(r.text)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head"><h2>Читалка</h2></div>
      <form className="form-row-grid" onSubmit={submit}>
        <input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <button className="btn btn-primary" disabled={busy}>Извлечь</button>
      </form>
      {error && <div className="error">{error}</div>}
      {text && <pre className="card read-out">{text}</pre>}
      {busy && <div className="row-sub">Загрузка…</div>}
    </div>
  )
}

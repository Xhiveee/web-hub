import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

const fmtSize = (n) => {
  if (n < 1024) return n + ' Б'
  if (n < 1048576) return (n / 1024).toFixed(1) + ' КБ'
  return (n / 1048576).toFixed(1) + ' МБ'
}

export default function Files() {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(null)
  const [expires, setExpires] = useState('')
  const [maxDownloads, setMaxDownloads] = useState('')
  const [shares, setShares] = useState([])
  const [sharesFor, setSharesFor] = useState(null)
  const [shareResult, setShareResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef(null)

  const load = () => api('GET', '/api/files').then(setFiles).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const upload = async (f) => {
    if (!f) return
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', f)
      await api('POST', '/api/files/upload', fd, true)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    upload(f)
  }

  const del = async (id) => {
    try {
      await api('DELETE', '/api/files/' + id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const download = (id) => {
    window.open('/api/files/' + id + '/download?token=' + encodeURIComponent(localStorage.getItem('wt') || ''), '_blank')
  }

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (e) {}
  }

  const fileLink = (id) => location.origin + '/api/files/' + id + '/download?token=' + encodeURIComponent(localStorage.getItem('wt') || '')

  const shareUrl = (token) => location.origin + '/s/' + token

  const openShare = async (f) => {
    setSharing(f)
    setExpires('')
    setMaxDownloads('')
    setShareResult(null)
    try {
      const list = await api('GET', '/api/files/' + f.id + '/shares')
      setShares(list)
    } catch (e) {
      setShares([])
    }
  }

  const doShare = async () => {
    try {
      const body = {
        expires: expires || null,
        max_downloads: maxDownloads ? parseInt(maxDownloads, 10) : null
      }
      const r = await api('POST', '/api/files/' + sharing.id + '/share', body)
      setShareResult(shareUrl(r.token))
      const list = await api('GET', '/api/files/' + sharing.id + '/shares')
      setShares(list)
    } catch (e) {
      setError(e.message)
    }
  }

  const revoke = async (token) => {
    try {
      await api('DELETE', '/api/share/' + token)
      const list = await api('GET', '/api/files/' + sharing.id + '/shares')
      setShares(list)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page" onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <div className="page-head">
        <h2>Файлы</h2>
        <button className="btn btn-primary" onClick={() => fileInput.current.click()}>Загрузить</button>
        <input ref={fileInput} type="file" hidden onChange={(e) => { upload(e.target.files[0]); e.target.value = '' }} />
      </div>
      {error && <div className="error">{error}</div>}
      {dragOver && <div className="drop-hint">Отпустите файл для загрузки</div>}
      <div className="list">
        {files.map((f) => (
          <div className="row card" key={f.id}>
            <div className="row-main">
              <div className="row-name">{f.name}</div>
              <div className="row-sub">{fmtSize(f.size)} · {new Date(f.created_at).toLocaleString()}</div>
            </div>
            <div className="row-actions">
              <button className="btn btn-ghost" onClick={() => download(f.id)} title="Скачать">⬇</button>
              <button className="btn btn-ghost" onClick={() => copy(fileLink(f.id))} title="Копировать ссылку">🔗</button>
              <button className="btn btn-ghost" onClick={() => openShare(f)} title="Поделиться">📤</button>
              <button className="btn btn-ghost danger" onClick={() => del(f.id)} title="Удалить">🗑</button>
            </div>
          </div>
        ))}
        {files.length === 0 && !error && <div className="empty">Нет файлов</div>}
      </div>

      {sharing && (
        <div className="modal-backdrop" onClick={() => setSharing(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>Поделиться: {sharing.name}</h3>
            <div className="form-row">
              <label>Срок действия</label>
              <select value={expires} onChange={(e) => setExpires(e.target.value)}>
                <option value="">Бессрочно</option>
                <option value="30m">30 минут</option>
                <option value="12h">12 часов</option>
                <option value="7d">7 дней</option>
              </select>
            </div>
            <div className="form-row">
              <label>Макс. скачиваний</label>
              <input type="number" min="1" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} placeholder="Без лимита" />
            </div>
            <button className="btn btn-primary" onClick={doShare}>Создать ссылку</button>
            {shareResult && (
              <div className="share-result">
                <code>{shareResult}</code>
                <button className="btn btn-ghost" onClick={() => copy(shareResult)}>Копировать</button>
              </div>
            )}
            {shares.length > 0 && (
              <div className="share-list">
                <h4>Существующие ссылки</h4>
                {shares.map((s) => (
                  <div className="share-row" key={s.id}>
                    <a href={shareUrl(s.token)} target="_blank" rel="noreferrer">{shareUrl(s.token)}</a>
                    <span className="row-sub">
                      {s.downloads}{s.max_downloads ? '/' + s.max_downloads : ''}
                      {s.expires_at ? ' · до ' + new Date(s.expires_at).toLocaleString() : ''}
                    </span>
                    <button className="btn btn-ghost danger" onClick={() => revoke(s.token)}>Отозвать</button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn" onClick={() => setSharing(null)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}

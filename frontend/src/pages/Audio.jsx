import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const raw = (id) => '/api/files/' + id + '/raw?token=' + encodeURIComponent(localStorage.getItem('wt') || '')

export default function Audio() {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api('GET', '/api/files')
      .then((list) => setFiles(list.filter((f) => f.mime && f.mime.startsWith('audio/'))))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="page">
      <div className="page-head"><h2>Аудио</h2></div>
      {error && <div className="error">{error}</div>}
      <div className="list">
        {files.map((f) => (
          <div className="card audio-row" key={f.id}>
            <div className="row-name">{f.name}</div>
            <audio controls src={raw(f.id)} preload="none" />
          </div>
        ))}
        {files.length === 0 && !error && <div className="empty">Нет аудиофайлов</div>}
      </div>
    </div>
  )
}

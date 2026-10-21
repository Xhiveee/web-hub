import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const raw = (id) => '/api/files/' + id + '/raw?token=' + encodeURIComponent(localStorage.getItem('wt') || '')

export default function Gallery() {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api('GET', '/api/files')
      .then((list) => setFiles(list.filter((f) => f.mime && f.mime.startsWith('image/'))))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="page">
      <div className="page-head"><h2>Галерея</h2></div>
      {error && <div className="error">{error}</div>}
      <div className="gallery-grid">
        {files.map((f) => (
          <img key={f.id} src={raw(f.id)} alt={f.name} onClick={() => setSelected(f)} />
        ))}
      </div>
      {files.length === 0 && !error && <div className="empty">Нет изображений</div>}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal modal-image" onClick={(e) => e.stopPropagation()}>
            <img src={raw(selected.id)} alt={selected.name} />
            <div className="modal-foot">
              <span>{selected.name}</span>
              <button className="btn" onClick={() => setSelected(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

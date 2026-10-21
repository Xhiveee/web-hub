import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function Share() {
  const { token } = useParams()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/share/' + token)
      .then(async (r) => {
        if (!r.ok) {
          setError(r.status === 403 ? 'Ссылка недоступна' : 'Файл не найден')
          return
        }
        setInfo(await r.json())
      })
      .catch(() => setError('Ошибка сети'))
  }, [token])

  return (
    <div className="login-wrap">
      <div className="login-card card">
        {error && <div className="error">{error}</div>}
        {info && (
          <>
            <h2>{info.name}</h2>
            <div className="row-sub">{info.size} байт</div>
            <a className="btn btn-primary" href={'/api/share/' + token + '/download'}>Скачать</a>
          </>
        )}
      </div>
    </div>
  )
}

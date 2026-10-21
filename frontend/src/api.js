const base = ''

export const authToken = () => localStorage.getItem('wt')

export function setToken(t) {
  if (t) localStorage.setItem('wt', t)
  else localStorage.removeItem('wt')
}

export async function api(method, path, body, isForm) {
  const headers = {}
  const token = authToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  let payload
  if (isForm) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(base + path, { method, headers, body: payload })
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = null
  }
  if (!res.ok) {
    const err = new Error((data && data.detail) || 'Ошибка ' + res.status)
    err.status = res.status
    throw err
  }
  return data
}

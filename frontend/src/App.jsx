import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { authToken, setToken, api } from './api.js'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Files from './pages/Files.jsx'
import Chat from './pages/Chat.jsx'
import Vault from './pages/Vault.jsx'
import Notes from './pages/Notes.jsx'
import Read from './pages/Read.jsx'
import Gallery from './pages/Gallery.jsx'
import Audio from './pages/Audio.jsx'
import Snippets from './pages/Snippets.jsx'
import Settings from './pages/Settings.jsx'
import Share from './pages/Share.jsx'

export default function App() {
  const [me, setMe] = useState(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!authToken()) {
      setReady(true)
      return
    }
    api('GET', '/api/auth/me')
      .then(setMe)
      .catch(() => {
        setToken(null)
        setMe(null)
      })
      .finally(() => setReady(true))
  }, [])

  const handleAuthed = (token) => {
    setToken(token)
    api('GET', '/api/auth/me').then(setMe)
    navigate('/files')
  }

  const logout = () => {
    setToken(null)
    setMe(null)
  }

  if (!ready) return null

  if (!authToken()) {
    return (
      <Routes>
        <Route path="/login" element={<Login onAuthed={handleAuthed} />} />
        <Route path="/s/:token" element={<Share />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout me={me} onLogout={logout}>
      <Routes>
        <Route path="/files" element={<Files />} />
        <Route path="/chat" element={<Chat me={me} />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/read" element={<Read />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/audio" element={<Audio />} />
        <Route path="/snippets" element={<Snippets />} />
        <Route path="/settings" element={<Settings me={me} setMe={setMe} />} />
        <Route path="/s/:token" element={<Share />} />
        <Route path="*" element={<Navigate to="/files" replace />} />
      </Routes>
    </Layout>
  )
}

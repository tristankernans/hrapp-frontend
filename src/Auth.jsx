import React, { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const API_BASE = 'hrapp-api-bme6bvfnh4dybnfr.ukwest-01.azurewebsites.net'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      if (res.ok) setUser(await res.json())
      else setUser(null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error('Invalid login')
    await refresh()
  }

  async function logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Loading...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
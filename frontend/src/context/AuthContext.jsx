import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('rfs_user')
    const token = localStorage.getItem('rfs_token')
    if (stored && token) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('rfs_token', data.token)
    localStorage.setItem('rfs_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await authAPI.register(payload)
    localStorage.setItem('rfs_token', data.token)
    localStorage.setItem('rfs_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('rfs_token')
    localStorage.removeItem('rfs_user')
    setUser(null)
  }

  const isInternal = user && ['ngo_volunteer', 'vendor'].includes(user.role)
  const isNgo = user?.role === 'ngo_volunteer'
  const isVendor = user?.role === 'vendor'
  const isDonor = user && ['general_public_donor', 'un_donor'].includes(user.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isInternal, isNgo, isVendor, isDonor }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

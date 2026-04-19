import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Store, Lock, ChevronRight, Zap, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'ngo_volunteer', label: 'NGO Volunteer', icon: Building2, accent: 'border-purple-700/50 bg-purple-950/30 text-purple-300', dot: 'bg-purple-500' },
  { value: 'vendor',        label: 'Food Vendor',   icon: Store,     accent: 'border-amber-700/50  bg-amber-950/30  text-amber-300',  dot: 'bg-amber-500'  },
]

const DEMOS = [
  { label: 'NGO Volunteer', email: 'ngo@demo.com',    role: 'ngo_volunteer', icon: Building2, accent: 'border-purple-700/40 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300' },
  { label: 'Food Vendor',   email: 'vendor@demo.com', role: 'vendor',        icon: Store,     accent: 'border-amber-700/40  bg-amber-950/20  hover:bg-amber-950/40  text-amber-300' },
]

export default function LoginPanel() {
  const navigate = useNavigate()
  const { login, register, user, isInternal } = useAuth()
  const [role, setRole] = useState('ngo_volunteer')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', country: 'hti' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (user && isInternal) {
    const isVendor = user.role === 'vendor'
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${isVendor ? 'bg-amber-600' : 'bg-purple-600'}`}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-100">{user.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{user.email}</p>
            <Badge color={isVendor ? 'amber' : 'purple'} className="mt-1.5">{user.role.replace(/_/g, ' ')}</Badge>
          </div>
          <Button className="w-full" size="sm" onClick={() => navigate('/dashboard')}>
            Open Dashboard <ChevronRight size={14} />
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const u = await login(form.email, form.password)
        if (!['ngo_volunteer', 'vendor'].includes(u.role)) { toast.error('This login is for staff only.'); return }
      } else {
        await register({ ...form, role })
      }
      toast.success('Welcome!')
      navigate('/dashboard')
    } catch (err) { toast.error(err.response?.data?.detail || 'Authentication failed') }
    finally { setLoading(false) }
  }

  const quickLogin = async (email) => {
    setLoading(true)
    try { await login(email, 'demo1234'); navigate('/dashboard') }
    catch { toast.error('Login failed — run seed-demo first') }
    finally { setLoading(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock size={12} className="text-purple-400" />
          Staff Login
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Quick demo */}
        <div className="rounded-lg border border-white/6 bg-white/2 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={10} className="text-amber-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Quick Demo</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMOS.map(d => (
              <button key={d.email} onClick={() => quickLogin(d.email)} disabled={loading}
                className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${d.accent}`}>
                <d.icon size={12} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-none truncate">{d.label}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">demo1234</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-white/6" />
          <span className="text-[10px] text-slate-600">or</span>
          <div className="flex-1 h-px bg-white/6" />
        </div>

        {/* Role tabs */}
        <div className="flex gap-1.5">
          {ROLES.map(r => (
            <button key={r.value} onClick={() => setRole(r.value)}
              className={`flex-1 flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                role === r.value ? r.accent : 'border-white/6 text-slate-500 hover:border-white/10'
              }`}>
              <r.icon size={12} />
              <span className="text-xs font-medium truncate">{r.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          {mode === 'register' && (
            <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} required />
          )}
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          <div className="relative">
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 bottom-2 text-slate-600 hover:text-slate-400 transition-colors">
              {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-0.5" size="sm">
            {loading ? 'Signing in…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-[11px] text-slate-600">
          {mode === 'login' ? 'New? ' : 'Have an account? '}
          <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} className="text-purple-400 hover:underline">
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </CardContent>
    </Card>
  )
}

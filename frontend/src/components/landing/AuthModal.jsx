import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Modal } from '../ui/Modal'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  general_public_donor: { label: 'General Donor',  color: 'green',  icon: User },
  un_donor:             { label: 'UN Donor',       color: 'blue',   icon: Shield },
  ngo_volunteer:        { label: 'NGO Staff',      color: 'purple', icon: Shield },
  vendor:               { label: 'Vendor',         color: 'amber',  icon: User },
}

export default function AuthModal({ open, onClose, defaultRole = 'general_public_donor', onSuccess }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '', country: 'hti',
    role: defaultRole, unVerified: false,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form)
      }
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const RoleInfo = ROLE_LABELS[form.role] || ROLE_LABELS.general_public_donor

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'login' ? 'Sign in as donor' : 'Create donor account'}
      description={mode === 'login' ? 'Continue your donation.' : 'Only takes a moment — no credit card required.'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'login' && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Shield size={11} className="text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Quick demo access
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Public Demo', email: 'donor@demo.com', color: 'emerald' },
                { label: 'UN Demo', email: 'un@demo.com', color: 'blue' },
              ].map(d => (
                <button
                  key={d.email}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true)
                    try {
                      await login(d.email, 'demo1234')
                      toast.success('Signed in')
                      onSuccess?.()
                    } catch {
                      toast.error('Login failed. Run seed-demo first.')
                    } finally { setLoading(false) }
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.05] transition-all text-left disabled:opacity-50"
                >
                  <div className={`shrink-0 w-6 h-6 rounded grid place-items-center ${d.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <User size={11} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-100 truncate">{d.label}</p>
                    <p className="text-[9px] text-slate-500 font-mono">demo1234</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 mb-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[9px] uppercase tracking-widest text-slate-600">or use email</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="shrink-0 w-8 h-8 rounded-md bg-white/[0.04] grid place-items-center">
              <RoleInfo.icon size={14} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Badge color={RoleInfo.color} size="md">{RoleInfo.label}</Badge>
              <span className="text-[11px] text-slate-500">access level</span>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <>
            <Input label="Full name" placeholder="Jean Dupont" value={form.name}
              onChange={e => set('name', e.target.value)} required />

            <Select label="Role" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="general_public_donor">General Public Donor</option>
              <option value="un_donor">UN-Affiliated Donor</option>
            </Select>

            <Input label="Phone (optional)" placeholder="+509 …" value={form.phone}
              onChange={e => set('phone', e.target.value)} />

            {form.role === 'un_donor' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/25 text-[11.5px] text-blue-200 leading-relaxed">
                UN verification: use your @un.org email, or check below to self-attest.
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.unVerified} onChange={e => set('unVerified', e.target.checked)}
                    className="accent-emerald-500" />
                  <span>I am UN-affiliated (self-attested)</span>
                </label>
              </motion.div>
            )}
          </>
        )}

        <Input label="Email" type="email" placeholder="you@example.org"
          value={form.email} onChange={e => set('email', e.target.value)} required />
        <Input label="Password" type="password" placeholder="••••••••"
          value={form.password} onChange={e => set('password', e.target.value)} required />

        <Button type="submit" className="w-full" disabled={loading} size="lg">
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>

        <p className="text-center text-xs text-slate-500">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-emerald-400 hover:text-emerald-300 font-medium">
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </form>
    </Modal>
  )
}

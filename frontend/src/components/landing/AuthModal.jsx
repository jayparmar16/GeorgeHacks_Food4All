import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Phone, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  general_public_donor: { label: 'General Donor', color: 'green', icon: User },
  un_donor: { label: 'UN Donor', color: 'blue', icon: Shield },
  ngo_volunteer: { label: 'NGO Staff', color: 'purple', icon: Shield },
  vendor: { label: 'Vendor', color: 'amber', icon: User },
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
    <Modal open={open} onClose={onClose} title={mode === 'login' ? 'Sign In' : 'Create Account'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Role badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/40">
          <RoleInfo.icon size={14} className="text-slate-400" />
          <Badge color={RoleInfo.color}>{RoleInfo.label}</Badge>
          <span className="text-xs text-slate-400">access level</span>
        </div>

        {mode === 'register' && (
          <>
            <Input label="Full Name" placeholder="Jean Dupont" value={form.name}
              onChange={e => set('name', e.target.value)} required />
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Role</label>
              <select
                value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="general_public_donor">General Public Donor</option>
                <option value="un_donor">UN-Affiliated Donor</option>
              </select>
            </div>
            <Input label="Phone (optional)" placeholder="+509 ..." value={form.phone}
              onChange={e => set('phone', e.target.value)} />
            {form.role === 'un_donor' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/40 text-xs text-blue-300">
                UN verification: use your @un.org email, or check below to self-attest.
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.unVerified} onChange={e => set('unVerified', e.target.checked)} />
                  I am UN-affiliated (self-attested)
                </label>
              </motion.div>
            )}
          </>
        )}

        <Input label="Email" type="email" placeholder="you@example.com" value={form.email}
          onChange={e => set('email', e.target.value)} required />
        <Input label="Password" type="password" placeholder="••••••••" value={form.password}
          onChange={e => set('password', e.target.value)} required />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>

        <p className="text-center text-xs text-slate-400">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-emerald-400 hover:underline">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, Store, Eye, EyeOff, Zap, ArrowLeft,
  ShieldCheck, Sparkles, Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { Badge } from '../components/ui/Badge'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'ngo_volunteer', label: 'NGO Volunteer', icon: Building2, description: 'Coordinate response on the ground',  color: 'purple' },
  { value: 'vendor',        label: 'Food Vendor',   icon: Store,     description: 'Sell rations, receive activations',    color: 'amber' },
]

const DEMOS = [
  { label: 'NGO Demo',    email: 'ngo@demo.com',    role: 'ngo_volunteer', icon: Building2, color: 'purple' },
  { label: 'Vendor Demo', email: 'vendor@demo.com', role: 'vendor',        icon: Store,     color: 'amber' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, register, user, isInternal } = useAuth()

  const [role, setRole] = useState('ngo_volunteer')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', country: 'hti' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (user && isInternal) navigate('/dashboard', { replace: true })
  }, [user, isInternal, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const u = await login(form.email, form.password)
        if (!['ngo_volunteer', 'vendor'].includes(u.role)) {
          toast.error('This login is for staff only.')
          return
        }
      } else {
        await register({ ...form, role })
      }
      toast.success('Welcome!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed')
    } finally { setLoading(false) }
  }

  const quickLogin = async (email) => {
    setLoading(true)
    try {
      await login(email, 'demo1234')
      toast.success('Signed in')
      navigate('/dashboard')
    } catch {
      toast.error('Login failed — run seed-demo first')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to home</span>
          </button>
          <Logo size="md" subtle />
          <div className="w-[120px]" />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Marketing panel (hidden on mobile) */}
        <aside className="hidden lg:flex relative border-r border-white/[0.06] bg-[#0a0b10]/60 overflow-hidden">
          <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(16,185,129,0.14) 0%, transparent 55%), radial-gradient(circle at 70% 80%, rgba(59,130,246,0.10) 0%, transparent 55%)',
          }} />
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div>
              <Badge color="green" dot pulse>
                Staff console
              </Badge>
              <h2 className="mt-6 text-4xl font-bold text-slate-50 tracking-tight leading-[1.1]">
                Run the response{' '}
                <span className="text-gradient">from one console.</span>
              </h2>
              <p className="mt-5 text-[15px] text-slate-400 leading-relaxed max-w-md">
                Preparedness mapping, activation signals, ration ticketing and
                supply routing — all connected to the vendors and farmers your
                community already trusts.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Sparkles, title: 'Gemini-assisted summaries', sub: 'Market pulse & routing narratives' },
                { icon: ShieldCheck, title: 'On-chain transparency', sub: 'Solana devnet for verifiable donations' },
                { icon: Zap, title: 'Fast activation', sub: 'SMS blast to vendors in minutes' },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] grid place-items-center">
                    <Icon size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{title}</p>
                    <p className="text-xs text-slate-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <div className="mb-7">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 mb-2.5">
                <Lock size={11} /> Staff Access
              </div>
              <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
                {mode === 'login' ? 'Sign in to your console' : 'Create a staff account'}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                {mode === 'login'
                  ? 'Access the operational dashboard for NGOs and vendors.'
                  : 'Register to begin coordinating response in your region.'}
              </p>
            </div>

            {/* Quick demo */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 mb-5">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Zap size={11} className="text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Quick demo access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMOS.map(d => (
                  <button
                    key={d.email}
                    onClick={() => quickLogin(d.email)}
                    disabled={loading}
                    className="group relative flex items-center gap-2.5 p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.05] text-left transition-all disabled:opacity-50"
                  >
                    <div className={`shrink-0 w-7 h-7 rounded-md grid place-items-center ${d.color === 'purple' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      <d.icon size={12} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-slate-100 truncate">{d.label}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">demo1234</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] uppercase tracking-widest text-slate-600">or continue with email</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {mode === 'register' && (
              <div className="mb-4">
                <p className="text-[11px] font-medium text-slate-400 mb-2">Select your role</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const active = role === r.value
                    const activeStyles = active
                      ? (r.color === 'purple'
                          ? 'border-purple-500/40 bg-purple-500/10'
                          : 'border-amber-500/40 bg-amber-500/10')
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]'
                    const iconCls = active
                      ? (r.color === 'purple' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300')
                      : 'bg-white/[0.04] text-slate-500'
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`relative flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${activeStyles}`}
                      >
                        <div className={`shrink-0 w-7 h-7 rounded-md grid place-items-center ${iconCls}`}>
                          <r.icon size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-100">{r.label}</p>
                          <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">{r.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === 'register' && (
                <Input label="Full name" value={form.name} onChange={e => set('name', e.target.value)} required autoComplete="name" />
              )}
              <Input
                label="Email"
                type="email"
                placeholder="you@example.org"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                rightIcon={
                  <button type="button" onClick={() => setShowPw(v => !v)} className="hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                }
              />

              <Button type="submit" size="lg" disabled={loading} className="w-full mt-1">
                {loading
                  ? 'Please wait…'
                  : mode === 'login' ? 'Sign in to console' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </section>
      </main>
    </div>
  )
}

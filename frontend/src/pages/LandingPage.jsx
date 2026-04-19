import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Store, Sprout, Globe2, ArrowRight, Zap, ShieldCheck,
  LogIn, LayoutDashboard, Code2, ExternalLink,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { activationAPI, ngoAPI, vendorAPI, farmerAPI } from '../lib/api'
import NGODirectory from '../components/landing/NGODirectory'
import DonationFlow from '../components/landing/DonationFlow'
import { AlertBanner } from '../components/ui/AlertBanner'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { CountrySelect } from '../components/ui/CountrySelect'
import { Stat } from '../components/ui/Stat'
import { Badge } from '../components/ui/Badge'

const STAT_CONFIG = [
  { icon: Users,   key: 'ngos',      label: 'NGO Partners',  accent: 'emerald' },
  { icon: Store,   key: 'vendors',   label: 'Vendors',       accent: 'amber' },
  { icon: Sprout,  key: 'farmers',   label: 'Farmers',       accent: 'teal' },
  { icon: Globe2,  key: 'countries', label: 'Countries',     accent: 'blue' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { country, setCountry, setActiveAlerts, activeAlerts } = useApp()
  const { user, isInternal } = useAuth()
  const [selectedNgo, setSelectedNgo] = useState(null)
  const [stats, setStats] = useState({ ngos: 0, vendors: 0, farmers: 0, countries: 2 })

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await activationAPI.active(country)
        setActiveAlerts(data.hasActive ? data.activations?.flatMap(a => a.alerts || []) || [] : [])
      } catch {}
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [country])

  useEffect(() => {
    Promise.all([
      ngoAPI.list({ country }).catch(() => ({ data: { total: 0 } })),
      vendorAPI.list({ country }).catch(() => ({ data: { total: 0 } })),
      farmerAPI.list({ country }).catch(() => ({ data: { total: 0 } })),
    ]).then(([n, v, f]) =>
      setStats(s => ({ ...s, ngos: n.data.total || 0, vendors: v.data.total || 0, farmers: f.data.total || 0 }))
    )
  }, [country])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Topbar */}
      <header className="sticky top-0 z-30 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto h-16 px-5 sm:px-8 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="shrink-0">
            <Logo size="md" subtle />
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-2 text-xs text-slate-400 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02]">
              <span className="relative flex">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-70" />
              </span>
              Live · Devnet
            </span>
            <CountrySelect value={country} onChange={setCountry} compact />
            {user && isInternal ? (
              <Button size="sm" onClick={() => navigate('/dashboard')}>
                <LayoutDashboard size={14} /> Dashboard
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                <LogIn size={14} /> Staff Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <AlertBanner alerts={activeAlerts} />

      {/* Hero */}
      <section className="relative">
        {/* Ambient gradient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-emerald-500/[0.06] blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.05] blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-16 md:pt-24 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2.5 mb-7">
              <Badge color="green" dot pulse size="md">Live in Haiti · DRC</Badge>
              <span className="text-xs text-slate-500 font-medium tracking-wide">
                Gemini AI · Solana Devnet
              </span>
            </div>
            <h1 className="text-[44px] md:text-[64px] leading-[1.05] font-bold tracking-tight text-slate-50 max-w-4xl mx-auto">
              Food aid that works{' '}
              <span className="text-gradient">through local communities.</span>
            </h1>
            <p className="mt-7 text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              We map, credential &amp; activate local food vendors and farmers so disaster relief
              flows through trusted community channels — in{' '}
              <strong className="text-slate-200 font-semibold">days, not weeks</strong>.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => document.getElementById('ngo-directory')?.scrollIntoView({ behavior: 'smooth' })}>
                Browse NGO Partners <ArrowRight size={15} />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
                Staff login <LogIn size={15} />
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                Transparent on-chain receipts
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={13} className="text-amber-500" />
                AI-assisted signal detection
              </span>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-16 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {STAT_CONFIG.map((s) => (
              <Stat
                key={s.key}
                icon={s.icon}
                label={s.label}
                value={stats[s.key]}
                accent={s.accent}
                size="lg"
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* NGO Directory + Donation Flow */}
      <section id="ngo-directory" className="border-t border-white/[0.06] bg-[#0a0b10]/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-20">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-2.5">
                Directory
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-50 tracking-tight">
                Verified NGOs operating on the ground
              </h2>
              <p className="text-base text-slate-400 mt-3 leading-relaxed">
                Search, filter and select an organization to route your donation directly on-chain.
                Live data from HDX 3W.
              </p>
            </div>
            <div className="hidden md:block">
              <CountrySelect value={country} onChange={setCountry} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <NGODirectory
                country={country}
                onCountryChange={setCountry}
                selectedNgo={selectedNgo}
                onSelectNgo={setSelectedNgo}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="lg:sticky lg:top-24"
            >
              <DonationFlow selectedNgo={selectedNgo} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SDG strip */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { sdg: 'SDG 2',  label: 'Zero Hunger',           text: 'Get local food to the people who need it, fast.',     accent: 'emerald' },
              { sdg: 'SDG 13', label: 'Climate Action',        text: 'Weather-aware activations and resilient supply.',     accent: 'blue' },
              { sdg: 'SDG 17', label: 'Partnerships for Goals', text: 'NGOs · UN agencies · vendors · farmers · donors.',    accent: 'purple' },
            ].map((s) => (
              <div key={s.sdg} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/[0.14] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <Badge color={s.accent === 'emerald' ? 'green' : s.accent === 'blue' ? 'blue' : 'purple'} size="md">
                    {s.sdg}
                  </Badge>
                  <span className="text-sm font-semibold text-slate-100">{s.label}</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-auto">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" subtle />
            <span className="text-xs text-slate-600 hidden sm:inline">·</span>
            <span className="text-xs text-slate-500">
              Built for humanitarian resilience — {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a href="#" className="text-xs text-slate-500 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5">
              Ethics <ExternalLink size={11} />
            </a>
            <a href="#" className="text-xs text-slate-500 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5">
              Architecture <ExternalLink size={11} />
            </a>
            <a href="#" className="text-xs text-slate-500 hover:text-slate-200 px-3 py-2 rounded-md hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5">
              <Code2 size={12} /> Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaf, Zap, Users, Store, Sprout, Globe2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { activationAPI, ngoAPI, vendorAPI, farmerAPI } from '../lib/api'
import NGODirectory from '../components/landing/NGODirectory'
import DonationFlow from '../components/landing/DonationFlow'
import LoginPanel from '../components/landing/LoginPanel'
import { AlertBanner } from '../components/ui/AlertBanner'

const STAT_CONFIG = [
  { icon: Users,  key: 'ngos',    label: 'NGOs',      cls: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40' },
  { icon: Store,  key: 'vendors', label: 'Vendors',   cls: 'text-amber-400   bg-amber-950/50   border-amber-800/30' },
  { icon: Sprout, key: 'farmers', label: 'Farmers',   cls: 'text-teal-400    bg-teal-950/50    border-teal-800/30' },
  { icon: Globe2, key: 'countries', label: 'Countries', cls: 'text-blue-400  bg-blue-950/50    border-blue-800/30' },
]

export default function LandingPage() {
  const { country, setCountry, setActiveAlerts, activeAlerts } = useApp()
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
    <div className="h-screen flex flex-col bg-[#08090e] overflow-hidden">
      <AlertBanner alerts={activeAlerts} />

      {/* Navbar */}
      <nav className="shrink-0 h-11 flex items-center justify-between px-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-900/60">
            <Leaf size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-tight">Resilient Food Systems</span>
          <span className="hidden sm:block text-[10px] text-slate-600 font-medium tracking-wider uppercase ml-1">
            SDG 2 · 13 · 17
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 bg-white/4 px-2.5 py-1 rounded-md border border-white/6">
            <Zap size={10} className="text-amber-500" />
            Gemini + Solana Devnet
          </span>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="text-xs bg-white/4 border border-white/8 text-slate-300 rounded-md px-2 py-1 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="hti">🇭🇹 Haiti</option>
            <option value="cod">🇨🇩 DRC</option>
          </select>
        </div>
      </nav>

      {/* Hero */}
      <div className="shrink-0 px-5 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
              <span className="text-[11px] text-slate-600">Haiti · DRC</span>
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight">
              Food Aid That Works<br />
              <span className="text-emerald-400">Through Local Communities</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 max-w-lg leading-relaxed">
              Map, credential &amp; activate local food vendors and farmers so disaster relief flows through trusted community channels — in <strong className="text-slate-400 font-medium">days, not weeks</strong>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.35 }}
            className="flex flex-wrap gap-2"
          >
            {STAT_CONFIG.map(({ icon: Icon, key, label, cls }) => (
              <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${cls}`}>
                <Icon size={12} />
                <span className="font-bold">{stats[key]}</span>
                <span className="text-slate-500">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Three-column grid */}
      <main className="flex-1 min-h-0 px-5 py-4">
        <div className="h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Col 1 — NGO Directory */}
          <motion.div
            className="min-h-0 flex flex-col"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          >
            <NGODirectory
              country={country}
              onCountryChange={setCountry}
              selectedNgo={selectedNgo}
              onSelectNgo={setSelectedNgo}
            />
          </motion.div>

          {/* Col 2 — Donate / Impact */}
          <motion.div
            className="min-h-0 flex flex-col"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            <DonationFlow selectedNgo={selectedNgo} />
          </motion.div>

          {/* Col 3 — Login + info */}
          <motion.div
            className="min-h-0 flex flex-col gap-3 overflow-y-auto"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          >
            <LoginPanel />
            <div className="rounded-xl border border-white/6 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-300 mb-1.5">Why local infrastructure?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                International aid builds distribution from outside in, after disaster strikes. We invert that — existing local vendors and farmers become the backbone of crisis response, activated in hours via SMS blast.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['SDG 2',  'Zero Hunger',   'text-emerald-400 bg-emerald-950/50 border-emerald-800/40'],
                ['SDG 13', 'Climate',       'text-blue-400    bg-blue-950/50    border-blue-800/30'],
                ['SDG 17', 'Partnerships',  'text-purple-400  bg-purple-950/50  border-purple-800/30'],
              ].map(([sdg, label, cls]) => (
                <div key={sdg} className={`p-2.5 rounded-xl border text-center ${cls}`}>
                  <p className="text-xs font-bold">{sdg}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

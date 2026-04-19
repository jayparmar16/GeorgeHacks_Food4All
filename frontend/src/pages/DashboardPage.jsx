import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, LogOut, Sun, CloudLightning, MapPin, Store, Sprout,
  Ticket, MessageSquare, Navigation, AlertTriangle, ChevronLeft, Map,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { vendorAPI, farmerAPI, activationAPI } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import ResilientMap from '../components/map/ResilientMap'
import VendorRegistration from '../components/dashboard/VendorRegistration'
import FarmerEnrollment from '../components/dashboard/FarmerEnrollment'
import TicketManager from '../components/dashboard/TicketManager'
import MarketPulse from '../components/dashboard/MarketPulse'
import SupplyRouting from '../components/dashboard/SupplyRouting'
import DisasterSignals from '../components/dashboard/DisasterSignals'

const BEFORE = [
  { id: 'map',      label: 'Overview Map',    icon: Map,           desc: 'Vendors, farmers & hotspots'           },
  { id: 'vendors',  label: 'Vendors',          icon: Store,         desc: 'RootNet food vendor registry'          },
  { id: 'farmers',  label: 'Farmers',          icon: Sprout,        desc: 'SowSafe crop pledge ledger'            },
  { id: 'hotspots', label: 'UN Hotspots',      icon: MapPin,        desc: 'WFP, UNHCR, MSF, UNICEF'              },
  { id: 'signals',  label: 'Signals',          icon: AlertTriangle, desc: 'USGS earthquakes + weather'           },
]

const AFTER = [
  { id: 'tickets',  label: 'Ration Tickets',   icon: Ticket,        desc: 'Issue & redeem food rations'          },
  { id: 'pulse',    label: 'Market Pulse',      icon: MessageSquare, desc: 'Vendor comms + Gemini summaries'      },
  { id: 'routing',  label: 'Supply Routing',    icon: Navigation,    desc: 'NetworkX road routing + AI narrative' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout, isInternal } = useAuth()
  const { country, setCountry, activeAlerts, setActiveAlerts } = useApp()
  const [tab, setTab] = useState('before')
  const [section, setSection] = useState('map')
  const [vendors, setVendors] = useState([])
  const [farmers, setFarmers] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [tick, setTick] = useState(0)

  useEffect(() => { if (!user || !isInternal) navigate('/', { replace: true }) }, [user, isInternal])

  useEffect(() => {
    vendorAPI.list({ country }).then(r => setVendors(r.data.vendors || [])).catch(() => {})
    farmerAPI.list({ country }).then(r => setFarmers(r.data.farmers || [])).catch(() => {})
    activationAPI.hotspots({ country }).then(r => setHotspots(r.data.hotspots || [])).catch(() => {})
    activationAPI.active(country).then(r => {
      if (r.data.hasActive) setActiveAlerts(r.data.activations?.flatMap(a => a.alerts || []) || [])
    }).catch(() => {})
  }, [country, tick])

  const sections = tab === 'before' ? BEFORE : AFTER
  const current = sections.find(s => s.id === section) || sections[0]

  useEffect(() => { setSection(sections[0].id) }, [tab])

  if (!user) return null
  const isVendor = user.role === 'vendor'

  return (
    <div className="h-screen flex flex-col bg-[#08090e] overflow-hidden">
      <AlertBanner alerts={activeAlerts} />

      {/* Header */}
      <header className="shrink-0 h-11 flex items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
            <Leaf size={11} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-200 tracking-tight hidden sm:block">Resilient Food</span>
          <Badge color={isVendor ? 'amber' : 'purple'}>{user.role.replace(/_/g, ' ')}</Badge>
          {activeAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-full">
              <AlertTriangle size={10} className="animate-pulse" />{activeAlerts.length} alert
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-3 text-[11px] text-slate-600 mr-1">
            <span>{vendors.length} vendors</span>
            <span>{farmers.length} farmers</span>
          </span>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="text-xs bg-white/4 border border-white/8 text-slate-300 rounded-md px-2 py-1 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="hti">🇭🇹 Haiti</option>
            <option value="cod">🇨🇩 DRC</option>
          </select>
          <span className="text-xs text-slate-600 hidden sm:block">{user.name}</span>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-0 border-b border-white/5">
        {[
          { id: 'before', label: 'Before Disaster', icon: Sun,           active: 'border-blue-500 text-blue-400' },
          { id: 'after',  label: 'After Disaster',  icon: CloudLightning, active: 'border-amber-500 text-amber-400' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              tab === t.id ? t.active : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-44 shrink-0 border-r border-white/5 flex flex-col pt-3 pb-4 px-2 overflow-y-auto hidden md:flex">
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-2">
            {tab === 'before' ? 'Preparedness' : 'Crisis Response'}
          </p>
          {sections.map(s => {
            const active = section === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5 ${
                  active
                    ? 'bg-white/8 text-slate-100'
                    : 'text-slate-500 hover:bg-white/4 hover:text-slate-300'
                }`}
              >
                {active && <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />}
                <s.icon size={13} className={active ? 'text-emerald-400' : 'text-slate-600'} />
                <span className="text-xs font-medium truncate">{s.label}</span>
              </button>
            )
          })}
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden shrink-0 border-b border-white/5 px-4 py-2">
          <select
            value={section}
            onChange={e => setSection(e.target.value)}
            className="w-full text-xs bg-white/4 border border-white/8 text-slate-300 rounded-md px-3 py-1.5 focus:outline-none"
          >
            {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto p-5">
          {/* Section header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-0.5">
              <current.icon size={14} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-100">{current.label}</h2>
            </div>
            <p className="text-xs text-slate-600">{current.desc}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab}-${section}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'before' && section === 'map' && (
                <div className="rounded-xl overflow-hidden border border-white/6" style={{ height: 520 }}>
                  <ResilientMap country={country} vendors={vendors} farmers={farmers} hotspots={hotspots} />
                </div>
              )}

              {tab === 'before' && section === 'vendors' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <VendorRegistration country={country} onRegistered={() => setTick(t => t + 1)} />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store size={12} className="text-amber-400" />
                        Active Vendors
                        <span className="ml-auto text-[10px] text-slate-600 font-normal">{vendors.length} total</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                        {vendors.map((v, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{v.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{v.foodTypes?.join(', ')} · {v.dailyCapacityKg} kg/day</p>
                            </div>
                            <div className="flex gap-1 ml-2 shrink-0">
                              {v.crisisActive && <Badge color="red">Crisis</Badge>}
                              {v.verified && <Badge color="green">✓</Badge>}
                            </div>
                          </div>
                        ))}
                        {!vendors.length && (
                          <div className="text-center py-10 text-xs text-slate-600">No vendors yet</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {tab === 'before' && section === 'farmers' && (
                <FarmerEnrollment country={country} onEnrolled={() => setTick(t => t + 1)} />
              )}

              {tab === 'before' && section === 'hotspots' && (
                <div className="rounded-xl overflow-hidden border border-white/6" style={{ height: 520 }}>
                  <ResilientMap country={country} hotspots={hotspots} />
                </div>
              )}

              {tab === 'before' && section === 'signals' && (
                <DisasterSignals country={country} onActivation={setActiveAlerts} />
              )}

              {tab === 'after' && section === 'tickets' && (
                <TicketManager country={country} />
              )}

              {tab === 'after' && section === 'pulse' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare size={12} className="text-blue-400" />
                      Live Market Pulse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarketPulse country={country} />
                  </CardContent>
                </Card>
              )}

              {tab === 'after' && section === 'routing' && (
                <SupplyRouting country={country} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

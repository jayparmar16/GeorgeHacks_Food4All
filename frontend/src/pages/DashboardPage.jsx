import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Sun, CloudLightning, MapPin, Store, Sprout,
  Ticket, MessageSquare, Navigation, AlertTriangle, ChevronLeft, Map, Bell,
  Users as UsersIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { vendorAPI, farmerAPI, activationAPI } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import { Card, CardContent } from '../components/ui/Card'
import { Logo } from '../components/ui/Logo'
import { CountrySelect } from '../components/ui/CountrySelect'
import { SegmentedTabs, PillTabs } from '../components/ui/Tabs'
import { SectionHeader } from '../components/ui/SectionHeader'
import { EmptyState } from '../components/ui/EmptyState'
import ResilientMap from '../components/map/ResilientMap'
import VendorRegistration from '../components/dashboard/VendorRegistration'
import FarmerEnrollment from '../components/dashboard/FarmerEnrollment'
import TicketManager from '../components/dashboard/TicketManager'
import MarketPulse from '../components/dashboard/MarketPulse'
import SupplyRouting from '../components/dashboard/SupplyRouting'
import DisasterSignals from '../components/dashboard/DisasterSignals'

const BEFORE = [
  { id: 'map',      label: 'Overview Map',  icon: Map,           description: 'Vendors, farmers & hotspots on one map',   accent: 'emerald' },
  { id: 'vendors',  label: 'Vendors',       icon: Store,         description: 'RootNet food vendor registry',              accent: 'amber' },
  { id: 'farmers',  label: 'Farmers',       icon: Sprout,        description: 'SowSafe crop pledge ledger',                accent: 'emerald' },
  { id: 'hotspots', label: 'UN Hotspots',   icon: MapPin,        description: 'WFP, UNHCR, MSF, UNICEF coverage',          accent: 'blue' },
  { id: 'signals',  label: 'Signals',       icon: AlertTriangle, description: 'USGS earthquakes + weather alerts',         accent: 'red' },
]

const AFTER = [
  { id: 'tickets',  label: 'Ration Tickets', icon: Ticket,        description: 'Issue and redeem food ration vouchers',      accent: 'emerald' },
  { id: 'pulse',    label: 'Market Pulse',   icon: MessageSquare, description: 'Vendor comms with Gemini summaries',         accent: 'blue' },
  { id: 'routing',  label: 'Supply Routing', icon: Navigation,    description: 'NetworkX road routing with AI narrative',    accent: 'amber' },
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
    <div className="min-h-screen flex flex-col">
      <AlertBanner alerts={activeAlerts} />

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto h-16 px-5 sm:px-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="shrink-0 p-2 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/[0.05] transition-colors"
              aria-label="Back to home"
            >
              <ChevronLeft size={18} />
            </button>
            <Logo size="md" subtle showText={false} />
            <div className="hidden sm:flex items-center gap-2.5 min-w-0">
              <span className="text-sm font-semibold text-slate-100">Console</span>
              <span className="w-px h-4 bg-white/10" />
              <Badge color={isVendor ? 'amber' : 'purple'} dot size="md">
                {user.role.replace(/_/g, ' ')}
              </Badge>
              {activeAlerts.length > 0 && (
                <Badge color="red" dot pulse size="md">
                  {activeAlerts.length} alert{activeAlerts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 tnum mr-1 px-2">
              <span><span className="text-slate-100 font-semibold">{vendors.length}</span> vendors</span>
              <span className="w-px h-3.5 bg-white/[0.08]" />
              <span><span className="text-slate-100 font-semibold">{farmers.length}</span> farmers</span>
            </div>
            <CountrySelect value={country} onChange={setCountry} compact />
            <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-xs font-bold text-slate-950">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-slate-200 max-w-[140px] truncate">{user.name}</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/') }}
              className="shrink-0 p-2 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/[0.05] transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="max-w-[1600px] mx-auto px-5 sm:px-7 pb-4 pt-1">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            size="md"
            options={[
              { value: 'before', label: 'Before Disaster', icon: Sun,            activeIconClass: 'text-blue-400' },
              { value: 'after',  label: 'After Disaster',  icon: CloudLightning, activeIconClass: 'text-amber-400', badge: activeAlerts.length || undefined },
            ]}
          />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 border-r border-white/[0.06] flex-col py-7 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 px-3 mb-3.5">
            {tab === 'before' ? 'Preparedness' : 'Crisis Response'}
          </p>
          <nav className="flex flex-col gap-1">
            {sections.map(s => {
              const active = section === s.id
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                    active
                      ? 'bg-white/[0.06] text-slate-100'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-100'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-emerald-400" />}
                  <Icon size={16} className={active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
                  <span className="text-sm font-medium truncate flex-1">{s.label}</span>
                  {s.id === 'signals' && activeAlerts.length > 0 && (
                    <Badge color="red" size="sm">{activeAlerts.length}</Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile pills */}
          <div className="md:hidden border-b border-white/[0.06] px-5 py-3.5">
            <PillTabs
              value={section}
              onChange={setSection}
              options={sections.map(s => ({ value: s.id, label: s.label, icon: s.icon }))}
            />
          </div>

          {/* Main */}
          <main className="flex-1 min-w-0 overflow-y-auto p-6 sm:p-8">
            <SectionHeader
              icon={current.icon}
              title={current.label}
              description={current.description}
              accent={current.accent}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${section}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {tab === 'before' && section === 'map' && (
                  <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0d14] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
                       style={{ height: 'min(720px, calc(100vh - 260px))', minHeight: 520 }}>
                    <ResilientMap country={country} vendors={vendors} farmers={farmers} hotspots={hotspots} />
                  </div>
                )}

                {tab === 'before' && section === 'vendors' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <VendorRegistration country={country} onRegistered={() => setTick(t => t + 1)} />
                    <Card>
                      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <Store size={13} className="text-amber-400" />
                          <span className="text-[13px] font-semibold text-slate-100">Active Vendors</span>
                        </div>
                        <Badge size="sm">{vendors.length} total</Badge>
                      </div>
                      <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto divide-y divide-white/[0.05]">
                          {vendors.map((v, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-100 truncate">{v.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {v.foodTypes?.join(', ') || '—'} · <span className="tnum">{v.dailyCapacityKg}</span> kg/day
                                </p>
                              </div>
                              <div className="flex gap-1 ml-2 shrink-0">
                                {v.crisisActive && <Badge color="red" dot pulse size="sm">Crisis</Badge>}
                                {v.verified && <Badge color="green" size="sm">Verified</Badge>}
                              </div>
                            </div>
                          ))}
                          {!vendors.length && (
                            <EmptyState icon={Store} title="No vendors yet" description="Register the first vendor to get started." compact />
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
                  <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0d14] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
                       style={{ height: 'min(720px, calc(100vh - 260px))', minHeight: 520 }}>
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
                  <MarketPulse country={country} />
                )}

                {tab === 'after' && section === 'routing' && (
                  <SupplyRouting country={country} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}

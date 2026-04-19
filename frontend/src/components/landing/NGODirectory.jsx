import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Users, RefreshCw, Database, CheckCircle2, ChevronRight } from 'lucide-react'
import { ngoAPI, adminAPI } from '../../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { CountrySelect } from '../ui/CountrySelect'
import { EmptyState } from '../ui/EmptyState'

const SECTOR_COLOR = {
  'Food Security': 'green', 'Disaster Relief': 'red', 'Nutrition': 'amber',
  'Education': 'blue', 'Water': 'cyan', 'Shelter': 'purple',
}
const tagColor = (s) => SECTOR_COLOR[s.trim()] || 'slate'

function NGOCard({ ngo, selected, onSelect }) {
  const sectors = (ngo.sectors || '').split(/[;,]/).map(s => s.trim()).filter(Boolean)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(ngo)}
      className={`group text-left w-full relative rounded-xl border px-4 py-4 transition-all duration-150 ${
        selected
          ? 'border-emerald-500/50 bg-emerald-500/[0.07] shadow-[0_0_0_1px_rgba(16,185,129,0.15)_inset]'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-100 leading-snug truncate">
              {ngo.organization}
            </p>
            {ngo.source === 'HDX 3W' && (
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/25">
                <Database size={9} />HDX
              </span>
            )}
          </div>

          {sectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {sectors.slice(0, 2).map((s, i) => <Badge key={i} color={tagColor(s)} size="sm">{s}</Badge>)}
              {sectors.length > 2 && (
                <span className="text-[11px] text-slate-500 self-center font-medium">+{sectors.length - 2}</span>
              )}
            </div>
          )}

          {ngo.region && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{ngo.region}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 pt-0.5">
          {selected ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-slate-950">
              <CheckCircle2 size={14} strokeWidth={2.5} />
            </span>
          ) : (
            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </div>
    </motion.button>
  )
}

export default function NGODirectory({ country, onCountryChange, selectedNgo, onSelectNgo }) {
  const [ngos, setNgos] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [seeding, setSeeding] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await ngoAPI.list({ country, search })
      setNgos(data.ngos || [])
      setTotal(data.total || 0)
    } catch { setNgos([]) } finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [country, search])

  const seed = async () => {
    setSeeding(true)
    try { await adminAPI.seedDemo(); await fetch() }
    finally { setSeeding(false) }
  }

  const hdx = ngos.filter(n => n.source === 'HDX 3W').length

  return (
    <Card className="flex flex-col h-full min-h-[600px]">
      <CardHeader className="pb-5">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>
            <Users size={15} className="text-emerald-400" />
            NGO Directory
            {total > 0 && (
              <Badge color="green" size="sm" className="ml-1">{total}</Badge>
            )}
          </CardTitle>
          <button
            onClick={fetch}
            disabled={loading}
            className="text-slate-500 hover:text-slate-100 transition-colors p-2 rounded-md hover:bg-white/[0.05]"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex gap-2.5">
          <CountrySelect value={country} onChange={onCountryChange} className="shrink-0" />
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              placeholder="Search by name or sector…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 h-10 text-sm bg-[#0c0e14] border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 hover:border-white/15 transition-colors"
            />
          </div>
        </div>

        {hdx > 0 && (
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <Database size={11} className="text-blue-400" />
            {hdx} sourced from HDX CKAN live data
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto pt-0">
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                <div className="h-3.5 shimmer rounded w-3/4 mb-2.5" />
                <div className="h-2.5 shimmer rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : ngos.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No NGOs found"
            description="Load sample data to explore the directory and donation flow."
            action={
              <Button variant="outline" size="sm" onClick={seed} disabled={seeding}>
                {seeding ? <><RefreshCw size={12} className="animate-spin" />Loading…</> : 'Load demo data'}
              </Button>
            }
          />
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-2.5">
              {ngos.map(ngo => (
                <NGOCard
                  key={ngo.id || ngo._id}
                  ngo={ngo}
                  selected={selectedNgo?.id === ngo.id || selectedNgo?._id === ngo._id}
                  onSelect={onSelectNgo}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}

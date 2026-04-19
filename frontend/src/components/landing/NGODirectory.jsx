import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Phone, Mail, MapPin, Users, RefreshCw, Database, CheckCircle2 } from 'lucide-react'
import { ngoAPI, adminAPI } from '../../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const SECTOR_COLOR = {
  'Food Security': 'green', 'Disaster Relief': 'red', 'Nutrition': 'amber',
  'Education': 'blue', 'Water': 'cyan', 'Shelter': 'purple',
}
function tagColor(s) { return SECTOR_COLOR[s.trim()] || 'slate' }

function NGOCard({ ngo, selected, onSelect }) {
  const sectors = (ngo.sectors || '').split(/[;,]/).map(s => s.trim()).filter(Boolean)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(ngo)}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        selected
          ? 'border-emerald-500/60 bg-emerald-950/30'
          : 'border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-200 leading-snug">{ngo.organization}</p>
        <div className="flex items-center gap-1 shrink-0">
          {selected && <CheckCircle2 size={12} className="text-emerald-400" />}
          {ngo.source === 'HDX 3W' && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <Database size={8} />HDX
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {sectors.slice(0, 2).map((s, i) => <Badge key={i} color={tagColor(s)}>{s}</Badge>)}
        {sectors.length > 2 && <span className="text-[10px] text-slate-600 self-center">+{sectors.length - 2}</span>}
      </div>
      {ngo.region && (
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin size={9} className="shrink-0" /><span className="truncate">{ngo.region}</span>
        </div>
      )}
      {(ngo.email || ngo.phone) && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-white/5">
          {ngo.email && (
            <a href={`mailto:${ngo.email}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-400">
              <Mail size={9} />Email
            </a>
          )}
          {ngo.phone && (
            <a href={`tel:${ngo.phone}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-400">
              <Phone size={9} />Call
            </a>
          )}
        </div>
      )}
    </motion.div>
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
    <Card className="flex flex-col min-h-0 h-full">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2">
            <Users size={13} className="text-emerald-400" />
            NGO Directory
            {total > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                {total}
              </span>
            )}
          </CardTitle>
          <button onClick={fetch} disabled={loading} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <select
          value={country}
          onChange={e => onCountryChange(e.target.value)}
          className="w-full mb-2 text-xs bg-white/4 border border-white/8 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="hti">🇭🇹 Haiti</option>
          <option value="cod">🇨🇩 DRC (Congo)</option>
        </select>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          <input
            placeholder="Search by name or sector…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/4 border border-white/8 text-slate-300 placeholder-slate-600 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>

        {hdx > 0 && (
          <p className="text-[10px] text-slate-600 mt-1.5 flex items-center gap-1">
            <Database size={9} className="text-blue-500" />
            {hdx} sourced from HDX CKAN live data
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col gap-2 p-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/2 p-3 animate-pulse">
                <div className="h-3 bg-white/8 rounded w-3/4 mb-2" />
                <div className="h-2.5 bg-white/4 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : ngos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Users size={20} className="text-slate-700" />
            <p className="text-xs text-slate-500">No NGOs found</p>
            <Button variant="outline" size="sm" onClick={seed} disabled={seeding}>
              {seeding ? <><RefreshCw size={11} className="animate-spin" />Loading…</> : 'Load Demo Data'}
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-1.5">
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

import { useState, useEffect } from 'react'
import { Navigation, Sparkles, Loader, MapPin, Flag } from 'lucide-react'
import { routingAPI } from '../../lib/api'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import ResilientMap from '../map/ResilientMap'
import toast from 'react-hot-toast'

const PRESET_DEPOTS = {
  hti: [
    { label: 'Port-au-Prince WFP Hub', lon: -72.338, lat: 18.543 },
    { label: 'Les Cayes Depot',         lon: -73.754, lat: 18.198 },
    { label: 'Cap-Haïtien Store',       lon: -72.200, lat: 19.757 },
  ],
  cod: [
    { label: 'Kinshasa WFP Depot', lon: 15.322, lat: -4.322 },
    { label: 'Goma Hub',            lon: 29.231, lat: -1.679 },
  ],
}

const PRESET_DESTINATIONS = {
  hti: [
    { label: 'Jérémie',   lon: -74.117, lat: 18.648 },
    { label: 'Corail',    lon: -73.889, lat: 18.562 },
    { label: 'Pestel',    lon: -74.038, lat: 18.580 },
    { label: 'Gonaïves',  lon: -72.686, lat: 19.447 },
  ],
  cod: [
    { label: 'Bukavu', lon: 28.845, lat: -2.508 },
    { label: 'Beni',   lon: 29.473, lat: 0.486 },
  ],
}

export default function SupplyRouting({ country = 'hti' }) {
  const [sourceLon, setSourceLon] = useState('')
  const [sourceLat, setSourceLat] = useState('')
  const [destLon, setDestLon] = useState('')
  const [destLat, setDestLat] = useState('')
  const [sourceLabel, setSourceLabel] = useState('Source')
  const [destLabel, setDestLabel] = useState('Destination')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [flaggedPlaces, setFlaggedPlaces] = useState([])
  const [markets, setMarkets] = useState([])

  useEffect(() => {
    routingAPI.flaggedPlaces({ country }).then(r => setFlaggedPlaces(r.data.places || [])).catch(() => {})
    routingAPI.markets({ country }).then(r => setMarkets(r.data.markets || [])).catch(() => {})
  }, [country])

  const selectDepot = (d) => { setSourceLon(d.lon); setSourceLat(d.lat); setSourceLabel(d.label) }
  const selectDest  = (d) => { setDestLon(d.lon);   setDestLat(d.lat);   setDestLabel(d.label) }

  const computeRoute = async () => {
    if (!sourceLon || !sourceLat || !destLon || !destLat) {
      toast.error('Set source and destination first')
      return
    }
    setLoading(true)
    try {
      const { data } = await routingAPI.route({
        sourceLon: parseFloat(sourceLon), sourceLat: parseFloat(sourceLat),
        destLon:   parseFloat(destLon),   destLat:   parseFloat(destLat),
        sourceLabel, destLabel, country,
      })
      setResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Routing failed')
    } finally { setLoading(false) }
  }

  const depots       = PRESET_DEPOTS[country] || []
  const destinations = PRESET_DESTINATIONS[country] || []

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr] gap-5">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Navigation size={13} className="text-amber-400" />
              Route Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Source */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Source depot
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {depots.map(d => (
                  <button
                    key={d.label}
                    onClick={() => selectDepot(d)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-medium border transition-all ${
                      sourceLabel === d.label
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.16] hover:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Lon" value={sourceLon} onChange={e => setSourceLon(e.target.value)} type="number" step="any" />
                <Input placeholder="Lat" value={sourceLat} onChange={e => setSourceLat(e.target.value)} type="number" step="any" />
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Destination
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {destinations.map(d => (
                  <button
                    key={d.label}
                    onClick={() => selectDest(d)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-medium border transition-all ${
                      destLabel === d.label
                        ? 'border-red-500/50 bg-red-500/10 text-red-200'
                        : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.16] hover:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Lon" value={destLon} onChange={e => setDestLon(e.target.value)} type="number" step="any" />
                <Input placeholder="Lat" value={destLat} onChange={e => setDestLat(e.target.value)} type="number" step="any" />
              </div>
            </div>

            <Button onClick={computeRoute} disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader size={14} className="animate-spin" /> Computing…</> : <><Navigation size={14} /> Compute route</>}
            </Button>

            {result && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                {result.distanceKm && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total distance</span>
                    <Badge color="amber" size="md">{result.distanceKm} km</Badge>
                  </div>
                )}
                {result.fallback && (
                  <p className="text-[11px] text-amber-300 leading-relaxed">{result.message}</p>
                )}
              </div>
            )}

            {flaggedPlaces.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Flag size={11} className="text-red-400" />
                  Underserved places <span className="text-slate-600">({flaggedPlaces.length})</span>
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {flaggedPlaces.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-[11.5px] px-2.5 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-red-300 truncate">{p.name}</span>
                      <span className="text-slate-500 tnum shrink-0 ml-2">{p.distanceToMarket} km</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0d14]" style={{ minHeight: 440 }}>
          <ResilientMap
            country={country}
            markets={markets}
            places={flaggedPlaces.map(p => ({ ...p, flagged: true, reason: p.reason }))}
            routeGeoJSON={result?.geojson}
            routeSource={sourceLon && sourceLat ? { lon: parseFloat(sourceLon), lat: parseFloat(sourceLat), label: sourceLabel } : null}
            routeDest={destLon && destLat ? { lon: parseFloat(destLon), lat: parseFloat(destLat), label: destLabel } : null}
          />
        </div>
      </div>

      {/* Gemini narrative */}
      {result?.narrative && (
        <div className="p-4 rounded-xl bg-blue-500/[0.06] border border-blue-500/25">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-blue-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Gemini routing narrative
            </span>
          </div>
          <p className="text-[13px] text-slate-200 leading-relaxed">{result.narrative}</p>
        </div>
      )}
    </div>
  )
}

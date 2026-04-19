import { useState, useEffect } from 'react'
import { Navigation, Zap, MapPin, Loader } from 'lucide-react'
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
    { label: 'Les Cayes Depot', lon: -73.754, lat: 18.198 },
    { label: 'Cap-Haïtien Store', lon: -72.200, lat: 19.757 },
  ],
  cod: [
    { label: 'Kinshasa WFP Depot', lon: 15.322, lat: -4.322 },
    { label: 'Goma Hub', lon: 29.231, lat: -1.679 },
  ],
}

const PRESET_DESTINATIONS = {
  hti: [
    { label: 'Jérémie', lon: -74.117, lat: 18.648 },
    { label: 'Corail', lon: -73.889, lat: 18.562 },
    { label: 'Pestel', lon: -74.038, lat: 18.580 },
    { label: 'Gonaïves', lon: -72.686, lat: 19.447 },
  ],
  cod: [
    { label: 'Bukavu', lon: 28.845, lat: -2.508 },
    { label: 'Beni', lon: 29.473, lat: 0.486 },
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
  const selectDest = (d) => { setDestLon(d.lon); setDestLat(d.lat); setDestLabel(d.label) }

  const computeRoute = async () => {
    if (!sourceLon || !sourceLat || !destLon || !destLat) {
      toast.error('Set source and destination first')
      return
    }
    setLoading(true)
    try {
      const { data } = await routingAPI.route({
        sourceLon: parseFloat(sourceLon), sourceLat: parseFloat(sourceLat),
        destLon: parseFloat(destLon), destLat: parseFloat(destLat),
        sourceLabel, destLabel, country,
      })
      setResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Routing failed')
    } finally { setLoading(false) }
  }

  const depots = PRESET_DEPOTS[country] || []
  const destinations = PRESET_DESTINATIONS[country] || []

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Navigation size={15} className="text-amber-400" />
              Route Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Source */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Source Depot</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {depots.map(d => (
                  <button key={d.label} onClick={() => selectDepot(d)}
                    className={`px-2 py-1 rounded-full text-xs border transition-all ${
                      sourceLabel === d.label ? 'border-emerald-500 bg-emerald-900/40 text-emerald-400' : 'border-slate-600 text-slate-400'
                    }`}>
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
              <label className="text-xs text-slate-400 mb-2 block">Destination</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {destinations.map(d => (
                  <button key={d.label} onClick={() => selectDest(d)}
                    className={`px-2 py-1 rounded-full text-xs border transition-all ${
                      destLabel === d.label ? 'border-red-500 bg-red-900/40 text-red-400' : 'border-slate-600 text-slate-400'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Lon" value={destLon} onChange={e => setDestLon(e.target.value)} type="number" step="any" />
                <Input placeholder="Lat" value={destLat} onChange={e => setDestLat(e.target.value)} type="number" step="any" />
              </div>
            </div>

            <Button onClick={computeRoute} disabled={loading} className="w-full">
              {loading ? <><Loader size={14} className="animate-spin" /> Computing…</> : <><Navigation size={14} /> Compute Route</>}
            </Button>

            {result && (
              <div className="space-y-2">
                {result.distanceKm && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Distance</span>
                    <Badge color="amber">{result.distanceKm} km</Badge>
                  </div>
                )}
                {result.fallback && (
                  <p className="text-xs text-amber-400">{result.message}</p>
                )}
              </div>
            )}

            {/* Flagged underserved places */}
            {flaggedPlaces.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Underserved Places ({flaggedPlaces.length})</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {flaggedPlaces.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-800/60">
                      <span className="text-red-400">{p.name}</span>
                      <span className="text-slate-500">{p.distanceToMarket} km</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ minHeight: 400 }}>
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
        <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-700/40">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Gemini Routing Narrative</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{result.narrative}</p>
        </div>
      )}
    </div>
  )
}

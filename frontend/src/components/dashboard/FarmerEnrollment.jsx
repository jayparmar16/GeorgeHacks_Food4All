import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sprout, CheckCircle } from 'lucide-react'
import { farmerAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Input, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import toast from 'react-hot-toast'

const CROPS_BY_COUNTRY = {
  hti: ['rice', 'beans', 'cornmeal', 'plantains', 'cassava', 'sugarcane', 'coffee', 'mango'],
  cod: ['cassava', 'maize', 'beans', 'sorghum', 'sweet potato', 'plantains', 'rice', 'groundnuts'],
}

const SEASONS = ['Spring (Mar-May)', 'Summer (Jun-Aug)', 'Fall (Sep-Nov)', 'Dry Season', 'Rainy Season', 'Year-round']

export default function FarmerEnrollment({ country = 'hti', onEnrolled }) {
  const [form, setForm] = useState({
    name: '', lon: '', lat: '', cropType: '', expectedYieldKg: '',
    plantingSeason: '', pledgedPercent: 17.5, phone: '', country,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const crops = CROPS_BY_COUNTRY[country] || CROPS_BY_COUNTRY.hti
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const pledgedKg = form.expectedYieldKg ? Math.round(form.expectedYieldKg * (form.pledgedPercent / 100)) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await farmerAPI.enroll({
        ...form,
        lon: parseFloat(form.lon), lat: parseFloat(form.lat),
        expectedYieldKg: parseFloat(form.expectedYieldKg),
        pledgedPercent: parseFloat(form.pledgedPercent),
      })
      setResult(data)
      toast.success('Enrolled in SowSafe!')
      onEnrolled?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Enrollment failed')
    } finally { setLoading(false) }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-100 mb-1">SowSafe Enrollment Complete!</h3>
          <p className="text-sm text-slate-400 mb-2">{result.name} — {result.cropType}</p>
          <div className="flex justify-center gap-3 flex-wrap mb-4">
            <Badge color="green">Pledged: {result.pledgedKg} kg</Badge>
            <Badge color="amber">Reserve Tag: {result.reserveTag}</Badge>
            <Badge color="blue">Insurance: Active</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Planting advance will be disbursed within 48 hours. Second payment on crisis activation.
          </p>
          <Button variant="outline" onClick={() => { setResult(null); setForm({ ...form, name: '', phone: '' }) }}>
            Enroll Another Farmer
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout size={16} className="text-green-400" />
          SowSafe Farmer Enrollment
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">Pledge a portion of your harvest as community reserve</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Farmer Name" value={form.name} onChange={e => set('name', e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Farm Longitude" placeholder="-72.33" value={form.lon} onChange={e => set('lon', e.target.value)} type="number" step="any" required />
            <Input label="Farm Latitude" placeholder="18.54" value={form.lat} onChange={e => set('lat', e.target.value)} type="number" step="any" required />
          </div>

          <Select label="Primary Crop" value={form.cropType} onChange={e => set('cropType', e.target.value)} required>
            <option value="">Select crop…</option>
            {crops.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Expected Yield (kg)" value={form.expectedYieldKg} onChange={e => set('expectedYieldKg', e.target.value)} type="number" min="10" required />
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Pledge % ({form.pledgedPercent}%)</label>
              <input type="range" min="15" max="20" step="0.5" value={form.pledgedPercent}
                onChange={e => set('pledgedPercent', e.target.value)}
                className="w-full accent-emerald-500" />
            </div>
          </div>

          {pledgedKg > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
              <p className="text-sm text-emerald-400">
                Pledged reserve: <strong>{pledgedKg} kg</strong> of {form.cropType}
              </p>
              <p className="text-xs text-slate-400 mt-1">You receive a guaranteed price + partial upfront advance</p>
            </motion.div>
          )}

          <Select label="Planting Season" value={form.plantingSeason} onChange={e => set('plantingSeason', e.target.value)} required>
            <option value="">Select season…</option>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Input label="Phone (SMS/WhatsApp)" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509..." />

          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/40 text-xs text-blue-300">
            In exchange: guaranteed minimum price · partial planting advance · crop insurance on pledged portion · priority in recovery markets
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Enrolling…' : 'Enroll in SowSafe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

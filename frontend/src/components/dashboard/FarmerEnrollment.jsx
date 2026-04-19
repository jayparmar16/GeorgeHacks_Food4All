import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sprout, CheckCircle, Phone } from 'lucide-react'
import { farmerAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Input, Select } from '../ui/Input'
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
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center mb-4">
            <CheckCircle size={26} className="text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 mb-1">SowSafe enrollment complete</h3>
          <p className="text-sm text-slate-500 mb-4">
            <span className="text-slate-300 font-medium">{result.name}</span> · {result.cropType}
          </p>
          <div className="flex justify-center gap-2 flex-wrap mb-5">
            <Badge color="green" size="lg">Pledged: {result.pledgedKg} kg</Badge>
            <Badge color="amber" size="lg">Reserve Tag: {result.reserveTag}</Badge>
            <Badge color="blue" size="lg">Insurance active</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-5 max-w-md mx-auto leading-relaxed">
            Planting advance will be disbursed within 48 hours. Second payment is issued on crisis activation.
          </p>
          <Button variant="outline" onClick={() => { setResult(null); setForm({ ...form, name: '', phone: '' }) }}>
            Enroll another farmer
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Sprout size={13} className="text-emerald-400" />
          SowSafe Farmer Enrollment
        </CardTitle>
        <CardDescription>Pledge a portion of your harvest as community reserve in exchange for a guaranteed price and insurance.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Farmer name" value={form.name} onChange={e => set('name', e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Farm longitude" placeholder="-72.33" value={form.lon} onChange={e => set('lon', e.target.value)} type="number" step="any" required />
            <Input label="Farm latitude"  placeholder="18.54"  value={form.lat} onChange={e => set('lat', e.target.value)} type="number" step="any" required />
          </div>

          <Select label="Primary crop" value={form.cropType} onChange={e => set('cropType', e.target.value)} required>
            <option value="">Select crop…</option>
            {crops.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Expected yield (kg)" value={form.expectedYieldKg} onChange={e => set('expectedYieldKg', e.target.value)} type="number" min="10" required />
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">
                Pledge <span className="text-emerald-400 font-semibold tnum">{form.pledgedPercent}%</span>
              </label>
              <input
                type="range"
                min="15" max="20" step="0.5"
                value={form.pledgedPercent}
                onChange={e => set('pledgedPercent', e.target.value)}
                className="w-full accent-emerald-500 h-9"
              />
            </div>
          </div>

          {pledgedKg > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25">
              <p className="text-sm text-emerald-200">
                Pledged reserve: <strong className="tnum">{pledgedKg} kg</strong> of {form.cropType}
              </p>
              <p className="text-[11.5px] text-slate-500 mt-1">
                You receive a guaranteed price plus a partial upfront advance.
              </p>
            </motion.div>
          )}

          <Select label="Planting season" value={form.plantingSeason} onChange={e => set('plantingSeason', e.target.value)} required>
            <option value="">Select season…</option>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Input label="Phone (SMS / WhatsApp)" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509…" leftIcon={<Phone size={12} />} />

          <div className="p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/25 text-[11.5px] text-blue-200 leading-relaxed">
            In exchange: guaranteed minimum price · partial planting advance · crop insurance on pledged portion · priority in recovery markets.
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? 'Enrolling…' : 'Enroll in SowSafe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

import { useState } from 'react'
import { Store, CheckCircle, Truck, Phone } from 'lucide-react'
import { vendorAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Input, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'

const FOOD_TYPES = ['rice', 'beans', 'cornmeal', 'plantains', 'cassava', 'cooking oil', 'dried fish', 'vegetables', 'livestock', 'palm oil', 'maize flour']

export default function VendorRegistration({ country = 'hti', onRegistered }) {
  const [form, setForm] = useState({
    name: '', lon: '', lat: '', operatingRadius: 5, foodTypes: [],
    dailyCapacityKg: 100, phone: '', contactMethod: 'sms',
    languages: [], storageCapacityKg: 0, hasTransport: false,
    culturalNotes: '', country,
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleFood = (type) => {
    const arr = form.foodTypes.includes(type) ? form.foodTypes.filter(t => t !== type) : [...form.foodTypes, type]
    set('foodTypes', arr)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await vendorAPI.register({
        ...form,
        lon: parseFloat(form.lon), lat: parseFloat(form.lat),
        operatingRadius: parseFloat(form.operatingRadius),
        dailyCapacityKg: parseFloat(form.dailyCapacityKg),
        storageCapacityKg: parseFloat(form.storageCapacityKg),
      })
      setResult(data)
      setDone(true)
      toast.success('Vendor registered in RootNet!')
      onRegistered?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  if (done && result) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center mb-4">
            <CheckCircle size={26} className="text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 mb-1">Welcome to RootNet</h3>
          <p className="text-sm text-slate-500 mb-5">
            <span className="text-slate-300 font-medium">{result.name}</span> is now a distribution node.
          </p>
          <Button variant="outline" onClick={() => { setDone(false); setForm({ ...form, name: '', phone: '' }) }}>
            Register another
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Store size={13} className="text-amber-400" />
          RootNet Vendor Registration
        </CardTitle>
        <CardDescription>Map yourself as a crisis-ready food distribution node.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Vendor / Business Name" value={form.name} onChange={e => set('name', e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Longitude" placeholder="-72.33" value={form.lon} onChange={e => set('lon', e.target.value)} type="number" step="any" required />
            <Input label="Latitude" placeholder="18.54" value={form.lat} onChange={e => set('lat', e.target.value)} type="number" step="any" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Operating Radius (km)" value={form.operatingRadius} onChange={e => set('operatingRadius', e.target.value)} type="number" min="0.5" />
            <Input label="Daily Capacity (kg)" value={form.dailyCapacityKg} onChange={e => set('dailyCapacityKg', e.target.value)} type="number" min="1" />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-2 block">Food types sold</label>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_TYPES.map(type => {
                const active = form.foodTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleFood(type)}
                    className={`px-3 h-7 rounded-full text-[11px] font-medium border transition-all ${
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.16] hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone / Contact" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509…" leftIcon={<Phone size={12} />} />
            <Select label="Contact Method" value={form.contactMethod} onChange={e => set('contactMethod', e.target.value)}>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="community_radio">Community Radio</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Storage Capacity (kg)" value={form.storageCapacityKg} onChange={e => set('storageCapacityKg', e.target.value)} type="number" min="0" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-400">Transport</label>
              <label className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[#0c0e14] border border-white/10 cursor-pointer hover:border-white/15 transition-colors">
                <input
                  type="checkbox"
                  checked={form.hasTransport}
                  onChange={e => set('hasTransport', e.target.checked)}
                  className="accent-emerald-500"
                />
                <Truck size={12} className="text-slate-500" />
                <span className="text-[13px] text-slate-300">I have transport</span>
              </label>
            </div>
          </div>

          <Textarea
            label="Cultural food knowledge & notes"
            rows={3}
            placeholder="What does your community actually eat? Any special items, seasons, preferences…"
            value={form.culturalNotes}
            onChange={e => set('culturalNotes', e.target.value)}
          />

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? 'Registering…' : 'Register as RootNet Vendor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

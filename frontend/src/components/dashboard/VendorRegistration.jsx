import { useState } from 'react'
import { motion } from 'framer-motion'
import { Store, MapPin, CheckCircle } from 'lucide-react'
import { vendorAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
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
        <CardContent className="py-8 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-100 mb-1">Welcome to RootNet!</h3>
          <p className="text-sm text-slate-400 mb-4">{result.name} is now registered as a distribution node.</p>
          <Button variant="outline" onClick={() => { setDone(false); setForm({ ...form, name: '', phone: '' }) }}>
            Register Another
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store size={16} className="text-emerald-400" />
          RootNet Vendor Registration
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">Map yourself as a crisis-ready food distribution node</p>
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
            <label className="text-sm text-slate-400 mb-2 block">Food Types Sold</label>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_TYPES.map(type => (
                <button key={type} type="button" onClick={() => toggleFood(type)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    form.foodTypes.includes(type)
                      ? 'border-emerald-500 bg-emerald-900/40 text-emerald-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone / Contact" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509..." />
            <Select label="Contact Method" value={form.contactMethod} onChange={e => set('contactMethod', e.target.value)}>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="community_radio">Community Radio</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Storage Capacity (kg)" value={form.storageCapacityKg} onChange={e => set('storageCapacityKg', e.target.value)} type="number" min="0" />
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Has Transport?</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.hasTransport} onChange={e => set('hasTransport', e.target.checked)} />
                <span className="text-sm text-slate-300">Yes, I have transport</span>
              </label>
            </div>
          </div>

          <Textarea label="Cultural Food Knowledge & Notes" rows={3}
            placeholder="What does your community actually eat? Any special items, seasons, preferences…"
            value={form.culturalNotes} onChange={e => set('culturalNotes', e.target.value)} />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Registering…' : 'Register as RootNet Vendor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

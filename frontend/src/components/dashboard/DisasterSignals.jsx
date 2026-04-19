import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Activity, Zap, Radio, RefreshCw } from 'lucide-react'
import { activationAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import toast from 'react-hot-toast'

const SEVERITY_COLORS = { watch: 'amber', warning: 'amber', emergency: 'red' }
const TRIGGER_ICONS = { earthquake: '🌍', weather: '🌪', displacement: '🚶', manual: '📢', auto_signal: '⚡' }

export default function DisasterSignals({ country = 'hti', onActivation }) {
  const [activations, setActivations] = useState([])
  const [hasActive, setHasActive] = useState(false)
  const [checking, setChecking] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [form, setForm] = useState({ description: '', severity: 'warning', triggerType: 'manual' })

  const fetchActivations = async () => {
    try {
      const { data } = await activationAPI.active(country)
      setActivations(data.activations || [])
      setHasActive(data.hasActive)
    } catch {}
  }

  useEffect(() => { fetchActivations() }, [country])

  const checkSignals = async () => {
    setChecking(true)
    try {
      const { data } = await activationAPI.check(country)
      if (data.threshold_crossed) {
        toast('⚠ Disaster signals detected!', { icon: '🚨' })
        onActivation?.(data.alerts)
      } else {
        toast.success('No active signals detected')
      }
      fetchActivations()
    } catch (err) {
      toast.error('Signal check failed')
    } finally { setChecking(false) }
  }

  const triggerManual = async () => {
    setTriggering(true)
    try {
      const { data } = await activationAPI.trigger({ ...form, country })
      toast.success(`Activation triggered! ${data.smsResults?.length || 0} vendors notified`)
      onActivation?.([{ type: 'manual', description: form.description }])
      fetchActivations()
      setForm({ description: '', severity: 'warning', triggerType: 'manual' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Trigger failed')
    } finally { setTriggering(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status banner */}
      {hasActive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-900/30 border border-red-700/60 flex items-center gap-3"
        >
          <AlertTriangle size={20} className="text-red-400 animate-pulse" />
          <div>
            <p className="font-semibold text-red-300">Active Disaster Alert</p>
            <p className="text-xs text-red-400">{activations.length} activation(s) recorded</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Signal check */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium text-slate-200 mb-1 flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" /> Auto Signals
            </p>
            <p className="text-xs text-slate-400 mb-3">Check USGS earthquakes + weather alerts</p>
            <Button variant="outline" size="sm" className="w-full" onClick={checkSignals} disabled={checking}>
              {checking ? <><RefreshCw size={12} className="animate-spin" /> Checking…</> : 'Check Now'}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-1.5">
              <Radio size={14} className="text-amber-400" /> Activation Log
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total</span><span>{activations.length}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Emergency</span>
                <span className="text-red-400">{activations.filter(a => a.severity === 'emergency').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            Manual Activation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            label="Alert Description"
            placeholder="Hurricane approaching Artibonite region…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Severity" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
              <option value="watch">Watch</option>
              <option value="warning">Warning</option>
              <option value="emergency">Emergency</option>
            </Select>
            <Select label="Trigger Type" value={form.triggerType} onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}>
              <option value="manual">Manual</option>
              <option value="earthquake">Earthquake</option>
              <option value="weather">Weather</option>
              <option value="displacement">Displacement</option>
            </Select>
          </div>
          <Button variant="danger" className="w-full" onClick={triggerManual} disabled={triggering || !form.description}>
            <AlertTriangle size={14} />
            {triggering ? 'Activating…' : 'Trigger Alert + SMS Vendors'}
          </Button>
        </CardContent>
      </Card>

      {/* Activation list */}
      {activations.length > 0 && (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {activations.map((a, i) => (
            <div key={i} className="p-3 rounded-lg border border-slate-700/60 bg-slate-800/40 flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{TRIGGER_ICONS[a.triggerType] || '⚡'}</span>
                  <Badge color={SEVERITY_COLORS[a.severity] || 'amber'}>{a.severity || 'alert'}</Badge>
                  <span className="text-xs text-slate-500">{a.triggerType}</span>
                </div>
                {a.description && <p className="text-xs text-slate-300">{a.description}</p>}
                <p className="text-xs text-slate-500 mt-0.5">{new Date(a.firedAt).toLocaleString()}</p>
              </div>
              {a.notifiedVendors?.length > 0 && (
                <Badge color="green">{a.notifiedVendors.length} notified</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

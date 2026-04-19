import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Activity, Zap, Radio, RefreshCw } from 'lucide-react'
import { activationAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import toast from 'react-hot-toast'

const SEVERITY_COLORS = { watch: 'amber', warning: 'amber', emergency: 'red' }
const TRIGGER_LABELS  = {
  earthquake:    { emoji: '🌍', label: 'Earthquake' },
  weather:       { emoji: '🌪',  label: 'Weather' },
  displacement:  { emoji: '🚶', label: 'Displacement' },
  manual:        { emoji: '📢', label: 'Manual' },
  auto_signal:   { emoji: '⚡', label: 'Auto Signal' },
}

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
        toast('Disaster signals detected!', { icon: '🚨' })
        onActivation?.(data.alerts)
      } else {
        toast.success('No active signals detected')
      }
      fetchActivations()
    } catch { toast.error('Signal check failed') }
    finally { setChecking(false) }
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

  const emergencyCount = activations.filter(a => a.severity === 'emergency').length

  return (
    <div className="flex flex-col gap-5">
      {hasActive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative p-4 rounded-xl bg-gradient-to-br from-red-950/70 via-red-900/40 to-red-950/70 border border-red-500/40 flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none opacity-20"
               style={{ background: 'radial-gradient(circle at 30% 50%, rgba(239,68,68,0.35), transparent 60%)' }} />
          <div className="relative shrink-0 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 grid place-items-center">
            <AlertTriangle size={18} className="text-red-300 animate-pulse" />
          </div>
          <div className="relative">
            <p className="font-semibold text-red-100">Active Disaster Alert</p>
            <p className="text-xs text-red-300 tnum">{activations.length} activation(s) recorded</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signal check */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Activity size={13} className="text-emerald-400" />
              Auto signal check
            </CardTitle>
            <CardDescription>Scan USGS earthquakes + live weather alerts for this country.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={checkSignals} disabled={checking}>
              {checking ? <><RefreshCw size={13} className="animate-spin" /> Checking…</> : <>Check now</>}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Radio size={13} className="text-amber-400" />
              Activation log
            </CardTitle>
            <CardDescription>History of activations recorded for this country.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Total</span>
              <span className="text-slate-200 font-semibold tnum">{activations.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Emergency</span>
              <Badge color="red" size="sm">{emergencyCount}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual trigger */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Zap size={13} className="text-amber-400" />
            Manual activation
          </CardTitle>
          <CardDescription>Trigger a disaster activation and SMS-blast your vendor network.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3.5">
          <Input
            label="Alert description"
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
            <Select label="Trigger type" value={form.triggerType} onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}>
              <option value="manual">Manual</option>
              <option value="earthquake">Earthquake</option>
              <option value="weather">Weather</option>
              <option value="displacement">Displacement</option>
            </Select>
          </div>
          <Button variant="danger" className="w-full" size="lg" onClick={triggerManual} disabled={triggering || !form.description}>
            <AlertTriangle size={14} />
            {triggering ? 'Activating…' : 'Trigger alert + SMS vendors'}
          </Button>
        </CardContent>
      </Card>

      {/* Activation list */}
      {activations.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Recent activations</p>
          {activations.map((a, i) => {
            const cfg = TRIGGER_LABELS[a.triggerType] || TRIGGER_LABELS.auto_signal
            return (
              <div key={i} className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base leading-none">{cfg.emoji}</span>
                    <Badge color={SEVERITY_COLORS[a.severity] || 'amber'} size="md">{a.severity || 'alert'}</Badge>
                    <span className="text-[11px] text-slate-500">{cfg.label}</span>
                  </div>
                  {a.description && <p className="text-[13px] text-slate-200 leading-relaxed">{a.description}</p>}
                  <p className="text-[10.5px] text-slate-500 mt-1.5 tnum">{new Date(a.firedAt).toLocaleString()}</p>
                </div>
                {a.notifiedVendors?.length > 0 && (
                  <Badge color="green" size="md">{a.notifiedVendors.length} notified</Badge>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={Radio} title="No activations recorded yet" description="Run an auto check or manually trigger an alert to begin." compact />
      )}
    </div>
  )
}

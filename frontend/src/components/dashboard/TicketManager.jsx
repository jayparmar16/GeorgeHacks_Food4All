import { useState, useEffect } from 'react'
import {
  Ticket, Plus, CheckCircle, Clock, XCircle, QrCode, Hash,
} from 'lucide-react'
import { ticketAPI } from '../../lib/api'
import { Card, CardContent } from '../ui/Card'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { EmptyState } from '../ui/EmptyState'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  issued:   { color: 'green',  icon: Ticket,      label: 'Issued'   },
  redeemed: { color: 'blue',   icon: CheckCircle, label: 'Redeemed' },
  expired:  { color: 'red',    icon: XCircle,     label: 'Expired'  },
}

function TicketCard({ ticket }) {
  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.issued
  const StatusIcon = cfg.icon
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-white/[0.14] transition-colors">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100 text-sm truncate">{ticket.beneficiaryName}</p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
            <Hash size={10} /> {ticket.ticketCode}
          </p>
        </div>
        <Badge color={cfg.color} size="md" dot>
          <StatusIcon size={10} />
          {cfg.label}
        </Badge>
      </div>

      {ticket.ration?.length > 0 && (
        <div className="space-y-1 mb-3 pb-3 border-b border-white/[0.05]">
          {ticket.ration.map((item, i) => (
            <div key={i} className="flex justify-between text-[11.5px]">
              <span className="text-slate-400">{item.item}</span>
              <span className="text-slate-200 tnum font-medium">{item.totalKg} kg</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between text-[11px] text-slate-500">
        <span className="truncate max-w-[60%]">{ticket.location}</span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {new Date(ticket.validUntil).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export default function TicketManager({ country = 'hti' }) {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [form, setForm] = useState({ beneficiaryName: '', location: '', householdSize: 1, notes: '', country })

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const { data } = await ticketAPI.list({ country })
      setTickets(data.tickets || [])
      setStats(data.stats || {})
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchTickets() }, [country])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const createTicket = async (e) => {
    e.preventDefault()
    try {
      await ticketAPI.create({ ...form, country, householdSize: parseInt(form.householdSize) })
      toast.success('Ticket created!')
      setShowCreate(false)
      fetchTickets()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const redeemTicket = async () => {
    if (!redeemCode.trim()) return
    try {
      const { data } = await ticketAPI.redeem({ ticketCode: redeemCode.trim().toUpperCase(), vendorId: 'manual' })
      toast.success(`Redeemed! Ration: ${data.ration?.map(r => r.item).join(', ')}`)
      setShowRedeem(false)
      setRedeemCode('')
      fetchTickets()
    } catch (err) { toast.error(err.response?.data?.detail || 'Redemption failed') }
  }

  const total = (stats.issued || 0) + (stats.redeemed || 0) + (stats.expired || 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{cfg.label}</p>
                <p className="text-2xl font-bold text-slate-100 tnum mt-1">{stats[status] || 0}</p>
              </div>
              <div className={`w-8 h-8 rounded-md grid place-items-center ${
                cfg.color === 'green' ? 'bg-emerald-500/10 text-emerald-400'
                : cfg.color === 'blue' ? 'bg-blue-500/10 text-blue-400'
                : 'bg-red-500/10 text-red-400'
              }`}>
                <cfg.icon size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowCreate(true)} className="flex-1">
          <Plus size={14} /> Issue ticket
        </Button>
        <Button variant="secondary" onClick={() => setShowRedeem(true)}>
          <QrCode size={14} /> Redeem
        </Button>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 h-[120px]">
              <div className="h-3 shimmer rounded w-1/2 mb-2" />
              <div className="h-2.5 shimmer rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets issued yet"
          description="Issue a ration ticket to a beneficiary — they can redeem it at any RootNet vendor."
          action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Issue first ticket</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
          {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Issue ration ticket"
        description="Create a redeemable food ration for a beneficiary."
      >
        <form onSubmit={createTicket} className="flex flex-col gap-4">
          <Input label="Beneficiary name" value={form.beneficiaryName} onChange={e => set('beneficiaryName', e.target.value)} required />
          <Input label="Location / Address" value={form.location} onChange={e => set('location', e.target.value)} required />
          <Input label="Household size" type="number" min="1" value={form.householdSize} onChange={e => set('householdSize', e.target.value)} />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/25 text-[11.5px] text-emerald-200 leading-relaxed">
            Ration composition will be culturally accurate for{' '}
            <strong>
              {country === 'hti' ? 'Haiti (rice, beans, cornmeal…)' : 'DRC (fufu, beans, palm oil…)'}
            </strong>.
          </div>
          <Button type="submit" className="w-full" size="lg">Issue ticket</Button>
        </form>
      </Modal>

      {/* Redeem modal */}
      <Modal
        open={showRedeem}
        onClose={() => setShowRedeem(false)}
        title="Redeem ration ticket"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Ticket code"
            placeholder="RFS-XXXXXXXX"
            value={redeemCode}
            onChange={e => setRedeemCode(e.target.value.toUpperCase())}
            className="font-mono"
          />
          <Button onClick={redeemTicket} disabled={!redeemCode} className="w-full" size="lg">
            Redeem ticket
          </Button>
        </div>
      </Modal>
    </div>
  )
}

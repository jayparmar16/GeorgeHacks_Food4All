import { useState, useEffect } from 'react'
import { Ticket, Plus, CheckCircle, Clock, XCircle, QrCode, Search } from 'lucide-react'
import { ticketAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Input, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  issued: { color: 'green', icon: Ticket, label: 'Issued' },
  redeemed: { color: 'blue', icon: CheckCircle, label: 'Redeemed' },
  expired: { color: 'red', icon: XCircle, label: 'Expired' },
}

function TicketCard({ ticket }) {
  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.issued
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-slate-100 text-sm">{ticket.beneficiaryName}</p>
          <p className="text-xs text-slate-400 font-mono">{ticket.ticketCode}</p>
        </div>
        <Badge color={cfg.color}>{cfg.label}</Badge>
      </div>
      <div className="space-y-1 mb-3">
        {ticket.ration?.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-slate-400">
            <span>{item.item}</span>
            <span>{item.totalKg} kg</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{ticket.location}</span>
        <span>Valid until {new Date(ticket.validUntil).toLocaleDateString()}</span>
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

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{stats[status] || 0}</p>
            <Badge color={cfg.color} className="mt-1">{cfg.label}</Badge>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowCreate(true)} className="flex-1">
          <Plus size={16} /> Issue Ticket
        </Button>
        <Button variant="outline" onClick={() => setShowRedeem(true)}>
          <QrCode size={16} /> Redeem
        </Button>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading tickets…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No tickets issued yet.</div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
          {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Issue Ration Ticket">
        <form onSubmit={createTicket} className="flex flex-col gap-4">
          <Input label="Beneficiary Name" value={form.beneficiaryName} onChange={e => set('beneficiaryName', e.target.value)} required />
          <Input label="Location / Address" value={form.location} onChange={e => set('location', e.target.value)} required />
          <Input label="Household Size" type="number" min="1" value={form.householdSize} onChange={e => set('householdSize', e.target.value)} />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/40 text-xs text-emerald-300">
            Ration composition will be culturally accurate for {country === 'hti' ? 'Haiti (rice, beans, cornmeal…)' : 'DRC (fufu, beans, palm oil…)'}
          </div>
          <Button type="submit" className="w-full">Issue Ticket</Button>
        </form>
      </Modal>

      {/* Redeem modal */}
      <Modal open={showRedeem} onClose={() => setShowRedeem(false)} title="Redeem Ration Ticket" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Ticket Code" placeholder="RFS-XXXXXXXX" value={redeemCode}
            onChange={e => setRedeemCode(e.target.value.toUpperCase())} />
          <Button onClick={redeemTicket} disabled={!redeemCode} className="w-full">Redeem</Button>
        </div>
      </Modal>
    </div>
  )
}

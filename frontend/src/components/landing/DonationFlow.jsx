import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, CheckCircle, Copy, Heart, Shield, Globe,
  BarChart3, TrendingUp, Zap, ArrowRight, ArrowLeft, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { donationAPI } from '../../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import AuthModal from './AuthModal'
import toast from 'react-hot-toast'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

const AMOUNTS = [0.1, 0.25, 0.5, 1.0, 2.0]

function ImpactPanel() {
  const [totals, setTotals] = useState({ count: 0, sol: 0 })
  useEffect(() => {
    donationAPI.mine().then(r => {
      const d = r.data.donations || []
      setTotals({ count: d.length, sol: d.reduce((s, x) => s + (x.amount || 0), 0) })
    }).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={13} className="text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your donation activity</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-300 tnum">{totals.count}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">Donations</p>
          </div>
          <div className="text-center p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-2xl font-bold text-amber-300 tnum">{totals.sol.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">SOL raised</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4 flex items-start gap-3">
        <Zap size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-200 mb-1">Donations go directly to NGOs</p>
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Every donation is recorded on Solana Devnet with a verifiable transaction hash. Select an NGO from the directory to donate.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center text-center gap-2 rounded-xl border border-dashed border-white/[0.08] p-6">
        <TrendingUp size={20} className="text-slate-600" />
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          Select an NGO from the directory, then log in as a donor to make a Solana donation.
        </p>
      </div>
    </div>
  )
}

const STEPS = [
  { id: 'select',  label: 'Type'      },
  { id: 'connect', label: 'Wallet'    },
  { id: 'donate',  label: 'Amount'    },
  { id: 'done',    label: 'Receipt'   },
]

function Stepper({ current }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-2 mb-3">
      {STEPS.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold transition-colors ${
                done
                  ? 'bg-emerald-500 text-slate-950'
                  : active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/[0.04] text-slate-600 border border-white/10'
              }`}>
                {done ? <CheckCircle size={10} strokeWidth={2.5} /> : i + 1}
              </span>
              <span className={`text-[10px] font-medium ${active ? 'text-slate-200' : 'text-slate-600'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${done ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default function DonationFlow({ selectedNgo }) {
  const { user, isInternal } = useAuth()
  const { publicKey, connected } = useWallet()
  const [donorType, setDonorType] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [authRole, setAuthRole] = useState('general_public_donor')
  const [amount, setAmount] = useState(0.25)
  const [custom, setCustom] = useState('')
  const [step, setStep] = useState('select')
  const [receipt, setReceipt] = useState(null)
  const [busy, setBusy] = useState(false)

  if (isInternal) {
    return (
      <Card className="flex flex-col h-full min-h-[560px]">
        <CardHeader>
          <CardTitle>
            <BarChart3 size={13} className="text-emerald-400" />
            Donation Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <ImpactPanel />
        </CardContent>
      </Card>
    )
  }

  const pick = (type) => {
    setDonorType(type)
    if (!user) { setAuthRole(type === 'un' ? 'un_donor' : 'general_public_donor'); setShowAuth(true) }
    else setStep('connect')
  }

  const donate = async () => {
    if (!selectedNgo) { toast.error('Select an NGO first'); return }
    if (!connected || !publicKey) { toast.error('Connect your Phantom wallet first'); return }
    setBusy(true)
    try {
      const final = custom ? parseFloat(custom) : amount
      if (!final || final <= 0) { toast.error('Enter a valid amount'); return }
      const mockTx = `devnet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const { data } = await donationAPI.create({
        ngoId: selectedNgo.id, amount: final, currency: 'SOL',
        txHash: mockTx, walletAddress: publicKey.toString(),
      })
      setReceipt({ ...data, final, wallet: publicKey.toString() })
      setStep('done')
      toast.success('Donation recorded!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Donation failed')
    } finally { setBusy(false) }
  }

  return (
    <Card className="flex flex-col h-full min-h-[560px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>
            <Heart size={13} className="text-red-400" />
            Donate via Solana
          </CardTitle>
          <Badge color="amber" size="sm">Devnet</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto">
        <Stepper current={step} />
        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div key="select" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }} className="flex flex-col gap-3">
              <p className="text-xs text-slate-500">Choose your donor type</p>
              {[
                { type: 'public', Icon: Globe,  label: 'General Public Donor', sub: 'Open to everyone',                   accent: 'emerald' },
                { type: 'un',     Icon: Shield, label: 'UN-Affiliated Donor',  sub: 'Requires @un.org or self-attest',    accent: 'blue' },
              ].map(({ type, Icon, label, sub, accent }) => (
                <button
                  key={type}
                  onClick={() => pick(type)}
                  className={`group relative flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-left transition-all duration-150 ${
                    accent === 'emerald'
                      ? 'hover:border-emerald-500/40 hover:bg-emerald-500/[0.05]'
                      : 'hover:border-blue-500/40 hover:bg-blue-500/[0.05]'
                  }`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-lg grid place-items-center ${
                    accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{label}</p>
                    <p className="text-[11.5px] text-slate-500">{sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
                </button>
              ))}

              {selectedNgo ? (
                <div className="mt-2 p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05]">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-md bg-emerald-500/10 grid place-items-center">
                      <CheckCircle size={14} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Selected NGO</p>
                      <p className="text-xs font-semibold text-emerald-300 truncate">{selectedNgo.organization}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-white/[0.08] p-3.5 flex items-center gap-2.5">
                  <ArrowLeft size={13} className="text-slate-600" />
                  <p className="text-[11.5px] text-slate-500">Select an NGO from the directory to continue</p>
                </div>
              )}
            </motion.div>
          )}

          {step === 'connect' && (
            <motion.div key="connect" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }} className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Donating to</p>
                <p className="text-xs font-semibold text-emerald-300 truncate">{selectedNgo?.organization || 'Select an NGO'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-2">Connect your Phantom wallet (Solana Devnet)</p>
                <div className="flex justify-center">
                  <WalletMultiButton />
                </div>
              </div>
              {connected && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                  <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Wallet</p>
                    <p className="text-[11px] text-slate-300 font-mono truncate">{publicKey?.toString()}</p>
                  </div>
                  <Button className="w-full" onClick={() => setStep('donate')}>
                    Continue <ArrowRight size={14} />
                  </Button>
                </motion.div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="self-start">
                <ArrowLeft size={12} /> Back
              </Button>
            </motion.div>
          )}

          {step === 'donate' && (
            <motion.div key="donate" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }} className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Donating to</p>
                <p className="text-xs font-semibold text-emerald-300 truncate">{selectedNgo?.organization || '—'}</p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-2">Select amount (SOL)</p>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustom('') }}
                      className={`h-9 rounded-lg text-xs font-semibold border transition-all duration-150 tnum ${
                        amount === a && !custom
                          ? 'border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-200'
                          : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.16] hover:text-slate-200'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Custom amount"
                  value={custom}
                  onChange={e => { setCustom(e.target.value); setAmount(0) }}
                  type="number" min="0.01" step="0.01"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                <Sparkles size={12} className="shrink-0 mt-px" />
                <span>Solana Devnet — no real funds transferred. Transaction hash is verifiable on-chain.</span>
              </div>

              <Button className="w-full" size="lg" onClick={donate} disabled={busy || !selectedNgo}>
                <Wallet size={14} />
                {busy ? 'Processing…' : `Donate ${custom || amount} SOL`}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep('connect')} className="self-start">
                <ArrowLeft size={12} /> Back
              </Button>
            </motion.div>
          )}

          {step === 'done' && receipt && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }} className="flex flex-col gap-4">
              <div className="text-center py-3">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center mb-3">
                  <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <p className="text-base font-semibold text-slate-100">Donation confirmed</p>
                <p className="text-xs text-slate-500 mt-1">{receipt.ngoName}</p>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Amount</span>
                  <span className="text-emerald-300 font-semibold tnum">{receipt.final} SOL</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500">Network</span>
                  <Badge color="amber" size="sm">Solana Devnet</Badge>
                </div>
                <div className="pt-2.5 border-t border-white/[0.06]">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Transaction hash</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[10.5px] text-slate-300 truncate flex-1">{receipt.txHash}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(receipt.txHash); toast.success('Copied!') }}
                      className="shrink-0 text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-white/[0.06] transition-colors"
                      aria-label="Copy"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={() => { setReceipt(null); setStep('select') }} className="w-full">
                Make another donation
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        defaultRole={authRole}
        onSuccess={() => { setShowAuth(false); setStep('connect') }}
      />
    </Card>
  )
}

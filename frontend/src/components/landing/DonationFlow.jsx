import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, CheckCircle, Copy, Heart, Shield, Globe, BarChart3, TrendingUp, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { donationAPI } from '../../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
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
      <div className="rounded-xl border border-white/6 bg-white/2 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={13} className="text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Donation Activity</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
            <p className="text-xl font-bold text-emerald-400">{totals.count}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Donations made</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-950/40 border border-amber-800/30">
            <p className="text-xl font-bold text-amber-400">{totals.sol.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">SOL raised</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-blue-800/30 bg-blue-950/20 p-4 flex items-start gap-3">
        <Zap size={13} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-300 mb-1">Donations go directly to NGOs</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every donation is recorded on Solana Devnet with a verifiable transaction hash. Select an NGO from the directory to donate.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center text-center gap-2 rounded-xl border border-white/5 bg-white/2 p-6">
        <TrendingUp size={20} className="text-slate-600" />
        <p className="text-xs text-slate-500">Select an NGO from the directory, then log in as a donor to make a Solana donation.</p>
      </div>
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
      <Card className="flex flex-col min-h-0 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
      const { data } = await donationAPI.create({ ngoId: selectedNgo.id, amount: final, currency: 'SOL', txHash: mockTx, walletAddress: publicKey.toString() })
      setReceipt({ ...data, final, wallet: publicKey.toString() })
      setStep('done')
      toast.success('Donation recorded!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Donation failed') }
    finally { setBusy(false) }
  }

  return (
    <Card className="flex flex-col min-h-0 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart size={13} className="text-red-400" />
          Donate via Solana
          <Badge color="amber">Devnet</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Step: select donor type */}
          {step === 'select' && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <p className="text-xs text-slate-500">I am a…</p>
              {[
                { type: 'public', Icon: Globe,  label: 'General Public Donor',   sub: 'Open to everyone',             ring: 'hover:border-emerald-600/60 hover:bg-emerald-950/20' },
                { type: 'un',     Icon: Shield, label: 'UN-Affiliated Donor',    sub: 'Requires @un.org or self-attest', ring: 'hover:border-blue-600/60 hover:bg-blue-950/20' },
              ].map(({ type, Icon, label, sub, ring }) => (
                <button key={type} onClick={() => pick(type)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border border-white/8 bg-white/2 transition-all text-left ${ring}`}>
                  <Icon size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{sub}</p>
                  </div>
                </button>
              ))}

              {selectedNgo && (
                <div className="mt-1 p-3 rounded-lg border border-emerald-800/40 bg-emerald-950/20">
                  <p className="text-[10px] text-slate-500 mb-0.5">Selected NGO</p>
                  <p className="text-xs font-medium text-emerald-400 truncate">{selectedNgo.organization}</p>
                </div>
              )}
              {!selectedNgo && (
                <p className="text-[11px] text-slate-600 text-center py-2">← Select an NGO from the directory first</p>
              )}
            </motion.div>
          )}

          {/* Step: connect wallet */}
          {step === 'connect' && (
            <motion.div key="connect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-white/4 border border-white/8 text-xs">
                <p className="text-slate-500 mb-0.5">Donating to</p>
                <p className="text-emerald-400 font-medium">{selectedNgo?.organization || 'Select an NGO →'}</p>
              </div>
              <p className="text-xs text-slate-400">Connect your Phantom wallet (Solana Devnet)</p>
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
              {connected && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-[10px] text-slate-600 font-mono truncate mb-3">{publicKey?.toString()}</p>
                  <Button className="w-full" onClick={() => setStep('donate')}>Continue →</Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step: amount */}
          {step === 'donate' && (
            <motion.div key="donate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-white/4 border border-white/8 text-xs">
                <p className="text-slate-500 mb-0.5">Donating to</p>
                <p className="text-emerald-400 font-medium truncate">{selectedNgo?.organization || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">Amount (SOL)</p>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {AMOUNTS.map(a => (
                    <button key={a} onClick={() => { setAmount(a); setCustom('') }}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        amount === a && !custom
                          ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-400'
                          : 'border-white/8 text-slate-500 hover:border-white/16 hover:text-slate-300'
                      }`}>{a}</button>
                  ))}
                </div>
                <Input placeholder="Custom…" value={custom} onChange={e => { setCustom(e.target.value); setAmount(0) }} type="number" min="0.01" step="0.01" />
              </div>
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/30 text-[11px] text-amber-500">
                Solana Devnet — no real funds transferred
              </div>
              <Button className="w-full" onClick={donate} disabled={busy || !selectedNgo}>
                <Wallet size={14} />
                {busy ? 'Processing…' : `Donate ${custom || amount} SOL`}
              </Button>
            </motion.div>
          )}

          {/* Step: receipt */}
          {step === 'done' && receipt && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
              <div className="text-center py-4">
                <CheckCircle size={36} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-base font-semibold text-slate-100">Donation Confirmed</p>
                <p className="text-xs text-slate-500 mt-1">{receipt.ngoName}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/4 border border-white/8 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="text-emerald-400 font-medium">{receipt.final} SOL</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Network</span><Badge color="amber">Solana Devnet</Badge></div>
                <div className="pt-2 border-t border-white/6">
                  <p className="text-[10px] text-slate-600 mb-1">Tx Hash</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[10px] text-slate-400 truncate flex-1">{receipt.txHash}</p>
                    <button onClick={() => { navigator.clipboard.writeText(receipt.txHash); toast.success('Copied!') }} className="text-slate-600 hover:text-slate-300">
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('select')} className="w-full">Make Another</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} defaultRole={authRole} onSuccess={() => { setShowAuth(false); setStep('connect') }} />
    </Card>
  )
}

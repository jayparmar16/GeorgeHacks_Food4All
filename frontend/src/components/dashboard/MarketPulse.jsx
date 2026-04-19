import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Sparkles, RefreshCw } from 'lucide-react'
import { pulseAPI } from '../../lib/api'
import { Card, CardContent } from '../ui/Card'
import { Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import toast from 'react-hot-toast'

const REGIONS_BY_COUNTRY = {
  hti: ['Port-au-Prince', 'Les Cayes', 'Jérémie', 'Cap-Haïtien', 'Gonaïves', 'Jacmel'],
  cod: ['Kinshasa', 'Goma', 'Bukavu', 'Lubumbashi', 'Kananga'],
}

const MSG_COLORS = { update: 'slate', price: 'amber', shortage: 'red', broadcast: 'blue' }

function Message({ msg }) {
  const ts = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const color = MSG_COLORS[msg.messageType] || 'slate'
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 grid place-items-center text-[10px] font-bold text-slate-950 shrink-0">
            {(msg.vendor || 'S')[0]?.toUpperCase()}
          </div>
          <span className="text-[12px] font-medium text-slate-200 truncate">{msg.vendor || 'System'}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge color={color} size="sm">{msg.messageType}</Badge>
          <span className="text-[10px] text-slate-600 tnum">{ts}</span>
        </div>
      </div>
      <p className="text-[13px] text-slate-200 leading-relaxed">{msg.text}</p>
    </div>
  )
}

export default function MarketPulse({ country = 'hti' }) {
  const [region, setRegion] = useState(REGIONS_BY_COUNTRY[country]?.[0] || '')
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [msgType, setMsgType] = useState('update')
  const [summarizing, setSummarizing] = useState(false)
  const bottomRef = useRef(null)

  const fetchMessages = async () => {
    if (!region) return
    try {
      const { data } = await pulseAPI.messages(region, { country })
      setMessages(data.messages || [])
    } catch {}
    try {
      const { data } = await pulseAPI.summary(region, { country })
      if (data.summary) setSummary(data.summary)
    } catch {}
  }

  useEffect(() => { setRegion(REGIONS_BY_COUNTRY[country]?.[0] || '') }, [country])
  useEffect(() => { fetchMessages() }, [region, country])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!newMsg.trim()) return
    try {
      await pulseAPI.postMessage({ region, text: newMsg, country, messageType: msgType, vendor: 'NGO Staff' })
      setNewMsg('')
      fetchMessages()
    } catch { toast.error('Failed to send') }
  }

  const summarize = async () => {
    setSummarizing(true)
    try {
      const { data } = await pulseAPI.summarize(region, { country })
      setSummary(data.summary)
      toast.success('Market pulse summary generated!')
    } catch { toast.error('Summary failed') } finally { setSummarizing(false) }
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-white/[0.06]">
          <div className="flex-1">
            <Select value={region} onChange={e => setRegion(e.target.value)}>
              {(REGIONS_BY_COUNTRY[country] || []).map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="subtle" size="md" onClick={fetchMessages}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button variant="secondary" size="md" onClick={summarize} disabled={summarizing}>
              <Sparkles size={13} className="text-amber-400" />
              {summarizing ? 'Summarizing…' : 'Gemini summary'}
            </Button>
          </div>
        </div>

        {/* Gemini summary */}
        {summary && (
          <div className="mx-4 mt-4 p-3.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/25">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={12} className="text-blue-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                Gemini market pulse
              </span>
            </div>
            <p className="text-[13px] text-slate-200 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Messages */}
        <div className="p-4 flex flex-col gap-2 max-h-[440px] overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={`No messages for ${region}`}
              description="Post the first market update — prices, shortages, or broadcasts."
              compact
            />
          ) : (
            messages.map((m, i) => <Message key={i} msg={m} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div className="p-3 border-t border-white/[0.06] flex flex-col sm:flex-row gap-2 bg-black/20">
          <select
            value={msgType}
            onChange={e => setMsgType(e.target.value)}
            className="h-9 rounded-lg bg-[#0c0e14] border border-white/10 px-2.5 text-[12px] text-slate-300 focus:outline-none focus:border-emerald-500/60 cursor-pointer sm:shrink-0"
          >
            <option value="update">Update</option>
            <option value="price">Price</option>
            <option value="shortage">Shortage</option>
            <option value="broadcast">Broadcast</option>
          </select>
          <input
            placeholder="Type a market update…"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 h-9 rounded-lg border border-white/10 bg-[#0c0e14] px-3 text-[13px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15"
          />
          <Button size="md" onClick={sendMessage} disabled={!newMsg.trim()}>
            <Send size={13} /> Send
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Zap, RefreshCw } from 'lucide-react'
import { pulseAPI } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
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
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-800/60 border border-slate-700/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{msg.vendor || 'System'}</span>
        <div className="flex items-center gap-1.5">
          <Badge color={color}>{msg.messageType}</Badge>
          <span className="text-xs text-slate-500">{ts}</span>
        </div>
      </div>
      <p className="text-sm text-slate-200">{msg.text}</p>
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
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const fetchMessages = async () => {
    if (!region) return
    try {
      const { data } = await pulseAPI.messages(region, { country })
      setMessages(data.messages || [])
    } catch {}
    // Fetch latest summary
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
    <div className="flex flex-col gap-4 h-full">
      {/* Region selector */}
      <div className="flex gap-2">
        <select
          value={region} onChange={e => setRegion(e.target.value)}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          {(REGIONS_BY_COUNTRY[country] || []).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={fetchMessages}><RefreshCw size={14} /></Button>
        <Button variant="secondary" size="sm" onClick={summarize} disabled={summarizing}>
          <Zap size={14} /> {summarizing ? '…' : 'Gemini Summary'}
        </Button>
      </div>

      {/* Gemini summary */}
      {summary && (
        <div className="p-3 rounded-xl bg-blue-900/20 border border-blue-700/40">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={12} className="text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Gemini Market Pulse</span>
          </div>
          <p className="text-sm text-slate-200">{summary}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-72">
        {messages.length === 0
          ? <p className="text-center text-slate-500 text-sm py-8">No messages yet for {region}</p>
          : messages.map((m, i) => <Message key={i} msg={m} />)
        }
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="flex gap-2 items-end">
        <select value={msgType} onChange={e => setMsgType(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none">
          <option value="update">Update</option>
          <option value="price">Price</option>
          <option value="shortage">Shortage</option>
          <option value="broadcast">Broadcast</option>
        </select>
        <input
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          placeholder="Type a market update…"
          value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim()}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  )
}

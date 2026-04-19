import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Globe, MapPin, Mail, Phone, Calendar, Building2, Heart,
  ExternalLink, Newspaper, Sparkles, Target, DollarSign, Loader2,
  ChevronRight, Database, Shield, Users,
} from 'lucide-react'
import { ngoAPI, donationAPI } from '../../lib/api'
import { Badge } from '../ui/Badge'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/8 rounded ${className}`} />
}

export default function NGODetailModal({ ngo, open, onClose, onSelectForDonation }) {
  const [profile, setProfile] = useState(null)
  const [news, setNews] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingNews, setLoadingNews] = useState(false)
  const [activeTab, setActiveTab] = useState('about')

  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)

  useEffect(() => {
    if (!open || !ngo?.id) return
    setProfile(null)
    setNews([])
    setTransactions([])
    setActiveTab('about')

    setLoadingProfile(true)
    ngoAPI.profile(ngo.id)
      .then(r => setProfile(r.data.profile))
      .catch(() => setProfile(null))
      .finally(() => setLoadingProfile(false))

    setLoadingNews(true)
    ngoAPI.news(ngo.id, 6)
      .then(r => setNews(r.data.articles || []))
      .catch(() => setNews([]))
      .finally(() => setLoadingNews(false))

    setLoadingTx(true)
    donationAPI.forNgo(ngo.id)
      .then(r => setTransactions(r.data.donations || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTx(false))
  }, [open, ngo?.id])

  if (!ngo) return null
  const sectors = (ngo.sectors || '').split(/[;,]/).map(s => s.trim()).filter(Boolean)

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#0c0e16] border border-white/8 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="relative shrink-0 px-6 pt-5 pb-4 border-b border-white/6">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ngo.source === 'HDX 3W' && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/40">
                        <Database size={8} />HDX Verified
                      </span>
                    )}
                    {profile && !loadingProfile && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-950/50 text-purple-400 border border-purple-800/40">
                        <Sparkles size={8} />AI Profile
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 leading-snug">{ngo.organization}</h2>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sectors.map((s, i) => (
                      <Badge key={i} color={s.includes('Food') ? 'green' : s.includes('Disaster') ? 'red' : 'blue'}>{s}</Badge>
                    ))}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick info bar */}
              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-400">
                {ngo.region && (
                  <span className="flex items-center gap-1"><MapPin size={10} className="text-emerald-500" />{ngo.region}</span>
                )}
                {ngo.email && (
                  <a href={`mailto:${ngo.email}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                    <Mail size={10} className="text-emerald-500" />{ngo.email}
                  </a>
                )}
                {ngo.phone && (
                  <a href={`tel:${ngo.phone}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                    <Phone size={10} className="text-emerald-500" />{ngo.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-white/6">
              {[
                { id: 'about', label: 'About', icon: Building2 },
                { id: 'news', label: `News${news.length > 0 ? ` (${news.length})` : ''}`, icon: Newspaper },
                { id: 'tx', label: `On-chain Support${transactions.length > 0 ? ` (${transactions.length})` : ''}`, icon: Database },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-all ${
                    activeTab === t.id
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {activeTab === 'about' && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {loadingProfile ? (
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="grid grid-cols-2 gap-3 mt-6">
                          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Description */}
                        <div className="mb-5">
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {profile?.description || `${ngo.organization} operates in the ${ngo.region || 'national'} region, focusing on ${sectors.join(', ').toLowerCase()}.`}
                          </p>
                        </div>

                        {/* Key facts grid */}
                        <div className="grid grid-cols-2 gap-2.5 mb-5">
                          {[
                            { icon: Calendar, label: 'Established', value: profile?.established || 'N/A', color: 'text-blue-400' },
                            { icon: Building2, label: 'Headquarters', value: profile?.headquarters || 'N/A', color: 'text-purple-400' },
                            { icon: Globe, label: 'Website', value: profile?.website ? 'Visit →' : 'N/A', href: profile?.website, color: 'text-cyan-400' },
                            { icon: Shield, label: 'Data Source', value: ngo.source === 'HDX 3W' ? 'HDX OCHA Verified' : 'Demo', color: 'text-amber-400' },
                          ].map((fact, i) => (
                            <div key={i} className="rounded-xl border border-white/6 bg-white/2 p-3 hover:bg-white/4 transition-colors">
                              <div className="flex items-center gap-1.5 mb-1">
                                <fact.icon size={11} className={fact.color} />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{fact.label}</span>
                              </div>
                              {fact.href ? (
                                <a href={fact.href} target="_blank" rel="noopener noreferrer"
                                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                                  {fact.value} <ExternalLink size={9} />
                                </a>
                              ) : (
                                <p className="text-xs font-semibold text-slate-200">{fact.value}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Focus areas */}
                        {profile?.focus_areas && profile.focus_areas.length > 0 && (
                          <div className="mb-5">
                            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Target size={11} className="text-emerald-400" />Focus Areas
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {(Array.isArray(profile.focus_areas) ? profile.focus_areas : [profile.focus_areas]).map((area, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Impact highlights */}
                        {profile?.impact_highlights && profile.impact_highlights.length > 0 && (
                          <div className="mb-5">
                            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Heart size={11} className="text-pink-400" />Impact
                            </h4>
                            <div className="space-y-2">
                              {(Array.isArray(profile.impact_highlights) ? profile.impact_highlights : [profile.impact_highlights]).map((h, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                  <ChevronRight size={12} className="text-pink-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-slate-300 leading-relaxed">{h}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* How donations are used */}
                        {profile?.donation_use && (
                          <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 p-4">
                            <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <DollarSign size={11} />How Your Donation Helps
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed">{profile.donation_use}</p>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === 'news' && (
                  <motion.div
                    key="news"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {loadingNews ? (
                      <div className="space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="rounded-xl border border-white/6 p-4">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-3 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : news.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Newspaper size={28} className="text-slate-700 mb-3" />
                        <p className="text-sm text-slate-400 mb-1">No recent news found</p>
                        <p className="text-xs text-slate-600 max-w-xs">
                          News articles about this organization will appear here when available from global news sources.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-slate-600 mb-2">
                          Recent articles from global news sources
                        </p>
                        {news.map((article, i) => (
                          <a
                            key={i}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl border border-white/6 bg-white/2 p-4 hover:bg-white/4 hover:border-white/12 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h5 className="text-xs font-semibold text-slate-200 leading-snug mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                  {article.title}
                                </h5>
                                {article.snippet && (
                                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-2">{article.snippet}</p>
                                )}
                                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                                  {article.source && <span className="font-medium text-slate-500">{article.source}</span>}
                                  {article.publishedAt && (
                                    <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  )}
                                </div>
                              </div>
                              <ExternalLink size={12} className="text-slate-600 group-hover:text-emerald-500 shrink-0 mt-0.5 transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'tx' && (
                  <motion.div
                    key="tx"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {loadingTx ? (
                      <div className="space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="rounded-xl border border-white/6 p-4 flex justify-between">
                            <div><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-3 w-48" /></div>
                            <Skeleton className="h-4 w-12" />
                          </div>
                        ))}
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Database size={28} className="text-slate-700 mb-3" />
                        <p className="text-sm text-slate-400 mb-1">No transaction history</p>
                        <p className="text-xs text-slate-600 max-w-xs">
                          Be the first to donate via Solana. Transactions will appear here verified on-chain.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-slate-600 mb-2">
                          Recent on-chain support on Solana Devnet
                        </p>
                        {transactions.map((tx, i) => (
                          <a
                            key={tx.id || i}
                            href={`https://explorer.solana.com/tx/${tx.txHash}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl border border-white/6 bg-white/2 p-3.5 hover:bg-white/4 hover:border-white/12 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 grid place-items-center border border-emerald-500/20">
                                <DollarSign size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 mb-0.5">
                                  {tx.donorName || 'Anonymous Donor'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-[10px] text-emerald-400/70 group-hover:text-emerald-400 transition-colors truncate max-w-[120px]">
                                    {tx.txHash}
                                  </p>
                                  <span className="text-slate-700 text-[10px]">•</span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-300">+{tx.amount} SOL</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-6 py-4 border-t border-white/6 bg-white/2">
              <button
                onClick={() => { onSelectForDonation?.(ngo); onClose() }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                <Heart size={14} />
                Select {ngo.organization?.split(' ')[0]} for Donation
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

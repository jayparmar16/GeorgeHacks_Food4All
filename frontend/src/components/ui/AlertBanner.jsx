import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

export function AlertBanner({ alerts = [] }) {
  const [dismissed, setDismissed] = useState(false)
  if (!alerts.length || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="shrink-0 overflow-hidden bg-gradient-to-r from-red-950/90 via-red-900/60 to-red-950/90 border-b border-red-500/30"
      >
        <div className="max-w-7xl mx-auto px-5 py-2 flex items-center gap-3">
          <span className="relative flex shrink-0">
            <AlertTriangle size={13} className="text-red-300" />
          </span>
          <div className="flex-1 flex flex-wrap items-center gap-x-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live Alert</span>
            <span className="w-px h-3 bg-red-500/40" />
            <p className="text-[12px] text-red-100 truncate flex-1 min-w-0">
              {alerts[0]?.description || alerts[0]?.event || `${alerts.length} disaster signal(s) active`}
            </p>
            {alerts.length > 1 && (
              <span className="text-[10px] font-semibold text-red-300 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30">
                +{alerts.length - 1} more
              </span>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-red-300/70 hover:text-red-100 hover:bg-red-500/10 rounded-md p-1 transition-colors"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

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
        className="shrink-0 overflow-hidden bg-red-950/80 border-b border-red-800/60 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2.5">
          <AlertTriangle size={13} className="text-red-400 shrink-0 animate-pulse" />
          <p className="flex-1 text-xs text-red-300">
            <span className="font-semibold mr-1.5">ALERT:</span>
            {alerts[0]?.description || alerts[0]?.event || `${alerts.length} disaster signal(s) active`}
          </p>
          <button onClick={() => setDismissed(true)} className="text-red-500 hover:text-red-300 transition-colors">
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

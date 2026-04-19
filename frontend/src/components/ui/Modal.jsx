import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from './Button'

const widths = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, description, size = 'md', children, footer, className }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            key="panel"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative w-full bg-[#12151d] border border-white/10 rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden',
              widths[size],
              className,
            )}
          >
            {(title || description) && (
              <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {title && <h2 className="text-[15px] font-semibold text-slate-100">{title}</h2>}
                    {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-md p-1 transition-colors"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
            <div className="px-6 py-5 max-h-[72vh] overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-white/[0.06] bg-black/20">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

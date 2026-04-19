import { forwardRef } from 'react'
import { clsx } from 'clsx'

const base = 'w-full rounded-lg border border-white/8 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-colors'

export const Input = forwardRef(({ className, label, error, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-slate-400">{label}</label>}
    <input ref={ref} className={clsx(base, error && 'border-red-500/60', className)} {...props} />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))
Input.displayName = 'Input'

export const Select = forwardRef(({ className, label, children, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-slate-400">{label}</label>}
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-white/8 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  </div>
))
Select.displayName = 'Select'

export const Textarea = forwardRef(({ className, label, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-slate-400">{label}</label>}
    <textarea
      ref={ref}
      className={clsx(base, 'resize-none', className)}
      {...props}
    />
  </div>
))
Textarea.displayName = 'Textarea'

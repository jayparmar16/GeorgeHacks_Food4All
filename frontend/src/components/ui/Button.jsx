import { forwardRef } from 'react'
import { clsx } from 'clsx'

const variants = {
  default:   'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/40',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  outline:   'border border-white/10 hover:bg-white/5 text-slate-300',
  ghost:     'hover:bg-white/5 text-slate-400 hover:text-slate-200',
  danger:    'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-900/40',
  amber:     'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-900/40',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export const Button = forwardRef(({ variant = 'default', size = 'md', className, disabled, children, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    className={clsx(
      'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      variants[variant] ?? variants.default,
      sizes[size] ?? sizes.md,
      className,
    )}
    {...props}
  >
    {children}
  </button>
))
Button.displayName = 'Button'

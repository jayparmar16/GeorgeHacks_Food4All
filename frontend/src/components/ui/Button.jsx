import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

const cn = (...args) => twMerge(clsx(args))

const button = cva(
  [
    'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'font-medium select-none transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080b]',
    'disabled:opacity-40 disabled:pointer-events-none',
    'active:translate-y-px',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-10px_rgba(16,185,129,0.6)] focus-visible:ring-emerald-400/60',
        secondary:
          'bg-white/[0.06] hover:bg-white/[0.10] text-slate-100 border border-white/10 focus-visible:ring-white/20',
        subtle:
          'bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 border border-white/[0.06] focus-visible:ring-white/20',
        outline:
          'border border-white/12 hover:border-white/20 hover:bg-white/[0.04] text-slate-200 focus-visible:ring-white/20',
        ghost:
          'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] focus-visible:ring-white/20',
        danger:
          'bg-red-500 hover:bg-red-400 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-10px_rgba(239,68,68,0.6)] focus-visible:ring-red-400/60',
        amber:
          'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-10px_rgba(245,158,11,0.6)] focus-visible:ring-amber-400/60',
        link:
          'text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline px-0 py-0 h-auto',
      },
      size: {
        xs: 'h-7  px-2.5 text-[11px] rounded-md gap-1',
        sm: 'h-8  px-3   text-xs    rounded-lg',
        md: 'h-9  px-3.5 text-[13px] rounded-lg',
        lg: 'h-10 px-4   text-sm    rounded-lg',
        xl: 'h-11 px-5   text-sm    rounded-xl',
        icon: 'h-8 w-8 rounded-lg',
        'icon-sm': 'h-7 w-7 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export const Button = forwardRef(
  ({ variant, size, className, children, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props}>
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export { cn }

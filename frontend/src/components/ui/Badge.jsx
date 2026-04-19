import { cva } from 'class-variance-authority'
import { cn } from './Button'

const badge = cva(
  'inline-flex items-center gap-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
  {
    variants: {
      color: {
        green:  'bg-emerald-500/10  text-emerald-300 border-emerald-500/25',
        blue:   'bg-blue-500/10     text-blue-300    border-blue-500/25',
        amber:  'bg-amber-500/10    text-amber-300   border-amber-500/25',
        red:    'bg-red-500/10      text-red-300     border-red-500/30',
        purple: 'bg-purple-500/10   text-purple-300  border-purple-500/25',
        cyan:   'bg-cyan-500/10     text-cyan-300    border-cyan-500/25',
        slate:  'bg-slate-500/10    text-slate-300   border-slate-500/25',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2   py-0.5 text-[10px]',
        lg: 'px-2.5 py-1   text-[11px]',
      },
      dot: { true: 'pl-1.5', false: '' },
    },
    defaultVariants: { color: 'slate', size: 'md' },
  }
)

const dotColor = {
  green: 'bg-emerald-400', blue: 'bg-blue-400', amber: 'bg-amber-400',
  red: 'bg-red-400', purple: 'bg-purple-400', cyan: 'bg-cyan-400', slate: 'bg-slate-400',
}

export function Badge({ color = 'slate', size, dot = false, className, children, pulse = false }) {
  return (
    <span className={cn(badge({ color, size, dot }), className)}>
      {dot && (
        <span className="relative flex">
          <span className={cn('w-1.5 h-1.5 rounded-full', dotColor[color])} />
          {pulse && <span className={cn('absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping opacity-70', dotColor[color])} />}
        </span>
      )}
      {children}
    </span>
  )
}

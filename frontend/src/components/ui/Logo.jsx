import { Leaf } from 'lucide-react'
import { cn } from './Button'

export function Logo({ size = 'md', subtle = false, showText = true, className }) {
  const dim = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
  const icon = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  const textSize = size === 'sm' ? 'text-[13px]' : size === 'lg' ? 'text-[17px]' : 'text-[15px]'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn(
        'relative shrink-0 rounded-lg grid place-items-center',
        'bg-gradient-to-br from-emerald-400 to-emerald-600',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_6px_14px_-6px_rgba(16,185,129,0.6)]',
        dim,
      )}>
        <Leaf size={icon} className="text-slate-950" strokeWidth={2.4} />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold text-slate-50 tracking-tight', textSize)}>
            Resilient <span className="text-emerald-400">Food</span>
          </span>
          {!subtle && (
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.18em] mt-1 font-semibold">
              Systems · SDG 2·13·17
            </span>
          )}
        </div>
      )}
    </div>
  )
}

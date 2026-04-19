import { cn } from './Button'

export function SegmentedTabs({ value, onChange, options, className, size = 'md' }) {
  const sizeCls = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-[13px]',
    lg: 'h-10 text-sm',
  }[size]

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08]',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg font-medium transition-all duration-150',
              sizeCls,
              active
                ? 'bg-white/[0.09] text-slate-100 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_1px_2px_0_rgba(0,0,0,0.5)]'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]',
            )}
          >
            {Icon && <Icon size={13} className={active ? opt.activeIconClass || 'text-emerald-400' : ''} />}
            {opt.label}
            {opt.badge != null && (
              <span className={cn(
                'ml-1 min-w-[1.25rem] h-[1.125rem] rounded-full px-1 text-[10px] font-semibold grid place-items-center',
                active ? 'bg-white/10 text-slate-100' : 'bg-white/[0.06] text-slate-400',
              )}>
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function PillTabs({ value, onChange, options, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory',
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'snap-start shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-medium border transition-all duration-150',
              active
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:border-white/15',
            )}
          >
            {Icon && <Icon size={12} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

import { cn } from './Button'

export function EmptyState({ icon: Icon, title, description, action, className, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]',
        compact ? 'py-8 px-4 gap-2' : 'py-14 px-6 gap-3',
        className,
      )}
    >
      {Icon && (
        <div className={cn('rounded-full bg-white/[0.03] border border-white/[0.06] grid place-items-center mb-1',
          compact ? 'w-9 h-9' : 'w-12 h-12')}>
          <Icon size={compact ? 16 : 20} className="text-slate-500" />
        </div>
      )}
      {title && <p className={cn('font-medium text-slate-300', compact ? 'text-xs' : 'text-sm')}>{title}</p>}
      {description && <p className={cn('text-slate-500 leading-relaxed max-w-sm', compact ? 'text-[11px]' : 'text-xs')}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

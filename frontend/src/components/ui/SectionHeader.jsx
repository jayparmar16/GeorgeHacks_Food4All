import { cn } from './Button'

export function SectionHeader({ icon: Icon, title, description, accent = 'emerald', children, className }) {
  const accentCls = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    amber:   'bg-amber-500/10   text-amber-300   border-amber-500/25',
    blue:    'bg-blue-500/10    text-blue-300    border-blue-500/25',
    red:     'bg-red-500/10     text-red-300     border-red-500/30',
    purple:  'bg-purple-500/10  text-purple-300  border-purple-500/25',
  }[accent] || 'bg-slate-500/10 text-slate-300 border-slate-500/25'

  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <div className={cn('shrink-0 w-11 h-11 rounded-lg border grid place-items-center', accentCls)}>
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight leading-tight">{title}</h2>
          {description && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</p>}
        </div>
      </div>
      {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
    </div>
  )
}

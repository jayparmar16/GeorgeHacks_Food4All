import { cn } from './Button'

const accentMap = {
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/[0.04]', border: 'border-emerald-500/20', icon: 'text-emerald-400 bg-emerald-500/10' },
  amber:   { text: 'text-amber-300',   bg: 'bg-amber-500/[0.04]',   border: 'border-amber-500/20',   icon: 'text-amber-400  bg-amber-500/10' },
  blue:    { text: 'text-blue-300',    bg: 'bg-blue-500/[0.04]',    border: 'border-blue-500/20',    icon: 'text-blue-400   bg-blue-500/10' },
  teal:    { text: 'text-teal-300',    bg: 'bg-teal-500/[0.04]',    border: 'border-teal-500/20',    icon: 'text-teal-400   bg-teal-500/10' },
  purple:  { text: 'text-purple-300',  bg: 'bg-purple-500/[0.04]',  border: 'border-purple-500/20',  icon: 'text-purple-400 bg-purple-500/10' },
  red:     { text: 'text-red-300',     bg: 'bg-red-500/[0.04]',     border: 'border-red-500/25',     icon: 'text-red-400    bg-red-500/10' },
  slate:   { text: 'text-slate-100',   bg: 'bg-white/[0.02]',       border: 'border-white/10',       icon: 'text-slate-300  bg-white/[0.04]' },
}

export function Stat({ icon: Icon, label, value, accent = 'slate', className, size = 'md' }) {
  const a = accentMap[accent] || accentMap.slate
  const sizes = {
    sm: { pad: 'px-4 py-3',   value: 'text-xl',   iconBox: 'w-9 h-9',  iconSize: 16, label: 'text-[11px]' },
    md: { pad: 'px-5 py-4',   value: 'text-2xl',  iconBox: 'w-10 h-10', iconSize: 18, label: 'text-[11.5px]' },
    lg: { pad: 'px-5 py-5',   value: 'text-3xl',  iconBox: 'w-11 h-11', iconSize: 20, label: 'text-xs' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className={cn(
      'rounded-xl border flex items-center gap-4 backdrop-blur-sm transition-colors',
      'hover:border-white/[0.14]',
      s.pad, a.bg, a.border, className
    )}>
      {Icon && (
        <div className={cn('shrink-0 rounded-lg grid place-items-center', s.iconBox, a.icon)}>
          <Icon size={s.iconSize} />
        </div>
      )}
      <div className="min-w-0">
        <p className={cn('font-bold leading-none tnum', s.value, a.text)}>{value}</p>
        <p className={cn('uppercase tracking-wider text-slate-500 mt-2 font-semibold', s.label)}>{label}</p>
      </div>
    </div>
  )
}

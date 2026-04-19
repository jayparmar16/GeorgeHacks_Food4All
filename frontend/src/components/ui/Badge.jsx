import { clsx } from 'clsx'

const colors = {
  green: 'bg-emerald-900/60 text-emerald-400 border-emerald-700/50',
  blue: 'bg-blue-900/60 text-blue-400 border-blue-700/50',
  amber: 'bg-amber-900/60 text-amber-400 border-amber-700/50',
  red: 'bg-red-900/60 text-red-400 border-red-700/50',
  purple: 'bg-purple-900/60 text-purple-400 border-purple-700/50',
  slate: 'bg-slate-700/60 text-slate-400 border-slate-600/50',
}

export function Badge({ color = 'slate', className, children }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  )
}

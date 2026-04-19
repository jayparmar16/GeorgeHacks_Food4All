import { cn } from './Button'

const COUNTRIES = [
  { code: 'hti', flag: '🇭🇹', name: 'Haiti', short: 'Haiti' },
  { code: 'cod', flag: '🇨🇩', name: 'DRC', short: 'DR Congo' },
]

export function CountrySelect({ value, onChange, className, compact = false }) {
  return (
    <label className={cn(
      'group relative inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer',
      compact ? 'h-8 pl-2.5 pr-7' : 'h-9 pl-3 pr-8',
      className,
    )}>
      <span className="text-base leading-none">{COUNTRIES.find(c => c.code === value)?.flag}</span>
      <span className="text-[12px] text-slate-200 font-medium">
        {COUNTRIES.find(c => c.code === value)?.short}
      </span>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-slate-300 transition-colors"
           width="12" height="12" viewBox="0 0 20 20" fill="none">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 8 4 4 4-4"/>
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
        ))}
      </select>
    </label>
  )
}

export const COUNTRY_LIST = COUNTRIES

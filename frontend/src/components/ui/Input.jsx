import { forwardRef } from 'react'
import { cn } from './Button'

const fieldBase =
  'w-full rounded-lg border border-white/10 bg-[#0c0e14] px-3 text-[13px] text-slate-100 placeholder-slate-600 ' +
  'transition-colors duration-150 ' +
  'hover:border-white/15 ' +
  'focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

function FieldShell({ label, error, hint, required, children }) {
  if (!label && !error && !hint) return children
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          {label}
          {required && <span className="text-emerald-400">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {!error && hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

export const Input = forwardRef(({ className, label, error, hint, required, leftIcon, rightIcon, ...props }, ref) => {
  const input = (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        required={required}
        className={cn(
          fieldBase,
          'h-9',
          leftIcon && 'pl-9',
          rightIcon && 'pr-9',
          error && 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15',
          className,
        )}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {rightIcon}
        </span>
      )}
    </div>
  )
  return <FieldShell label={label} error={error} hint={hint} required={required}>{input}</FieldShell>
})
Input.displayName = 'Input'

export const Select = forwardRef(({ className, label, error, hint, required, children, ...props }, ref) => {
  const el = (
    <select
      ref={ref}
      required={required}
      className={cn(
        fieldBase,
        'h-9 cursor-pointer appearance-none pr-9',
        'bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27><path stroke=%27%236a7180%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/></svg>")] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:1.1rem]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
  return <FieldShell label={label} error={error} hint={hint} required={required}>{el}</FieldShell>
})
Select.displayName = 'Select'

export const Textarea = forwardRef(({ className, label, error, hint, required, rows = 3, ...props }, ref) => {
  const el = (
    <textarea
      ref={ref}
      rows={rows}
      required={required}
      className={cn(fieldBase, 'py-2 resize-none leading-relaxed', className)}
      {...props}
    />
  )
  return <FieldShell label={label} error={error} hint={hint} required={required}>{el}</FieldShell>
})
Textarea.displayName = 'Textarea'

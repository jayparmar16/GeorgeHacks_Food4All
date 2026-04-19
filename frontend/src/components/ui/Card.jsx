import { clsx } from 'clsx'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-white/6 bg-slate-900/70 backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div className={clsx('px-4 py-3 border-b border-white/6', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={clsx('text-sm font-semibold text-slate-200', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children }) {
  return <div className={clsx('px-4 py-3', className)}>{children}</div>
}

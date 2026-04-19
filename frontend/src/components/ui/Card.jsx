import { cn } from './Button'

export function Card({ className, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-white/[0.06] bg-[#0c0e14]/80 backdrop-blur-sm',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-16px_rgba(0,0,0,0.6)]',
        interactive && 'transition-all duration-150 hover:border-white/[0.12] hover:bg-[#12151d]/80',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col gap-1 px-5 pt-4 pb-3', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, as: As = 'h3', ...props }) {
  return (
    <As
      className={cn('text-[13px] font-semibold text-slate-100 leading-tight flex items-center gap-2', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-xs text-slate-500 leading-relaxed', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center px-5 py-3 border-t border-white/[0.06]', className)}
      {...props}
    />
  )
}

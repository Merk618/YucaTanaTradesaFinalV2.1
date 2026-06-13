import { cn } from '@/lib/utils'

type Status = 'offline' | 'unavailable' | 'connect' | 'neutral' | 'live'

const styles: Record<Status, string> = {
  offline: 'border-negative/30 bg-negative/10 text-negative',
  unavailable: 'border-border bg-muted text-muted-foreground',
  connect: 'border-gold/40 bg-gold/10 text-gold',
  neutral: 'border-border bg-secondary text-secondary-foreground',
  live: 'border-positive/30 bg-positive/10 text-positive',
}

export function StatusPill({
  status = 'neutral',
  children,
  className,
  dot = true,
}: {
  status?: Status
  children: React.ReactNode
  className?: string
  dot?: boolean
}) {
  const dotColor: Record<Status, string> = {
    offline: 'bg-negative',
    unavailable: 'bg-muted-foreground',
    connect: 'bg-gold',
    neutral: 'bg-muted-foreground',
    live: 'bg-positive',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        styles[status],
        className,
      )}
    >
      {dot && (
        <span className={cn('size-1.5 rounded-full', dotColor[status])} />
      )}
      {children}
    </span>
  )
}

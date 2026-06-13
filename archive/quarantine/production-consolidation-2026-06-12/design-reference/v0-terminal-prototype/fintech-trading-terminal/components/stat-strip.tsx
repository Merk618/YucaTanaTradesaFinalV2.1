import { cn } from '@/lib/utils'

export type Stat = {
  label: string
  value?: string
  hint?: string
}

export function StatStrip({
  stats,
  className,
}: {
  stats: Stat[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1.5 bg-card px-4 py-3.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {s.label}
          </span>
          <span
            className={cn(
              'font-mono text-lg tabular-nums',
              s.value ? 'text-foreground' : 'text-muted-foreground/50',
            )}
          >
            {s.value ?? '—'}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {s.hint ?? 'Unavailable'}
          </span>
        </div>
      ))}
    </div>
  )
}

import { StatusPill } from '@/components/status-pill'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-muted">
            {eyebrow}
          </span>
        )}
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions ?? <StatusPill status="offline">Provider Offline</StatusPill>}
      </div>
    </div>
  )
}

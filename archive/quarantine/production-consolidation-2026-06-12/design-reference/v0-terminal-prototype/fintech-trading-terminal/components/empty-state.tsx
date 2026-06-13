import Link from 'next/link'
import { PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon = PlugZap,
  title = 'Connect a Data Source',
  description = 'No market data provider is connected. Link a provider in the Provider Vault to populate this view with live data.',
  className,
  compact = false,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  description?: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/40 text-center',
        compact ? 'px-6 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-lg border border-gold/30 bg-background">
        <Icon className="size-5 text-gold" />
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href="/settings">Connect Data Source</Link>}
        size="sm"
        className="bg-gold text-primary-foreground hover:bg-gold/90"
      />
    </div>
  )
}

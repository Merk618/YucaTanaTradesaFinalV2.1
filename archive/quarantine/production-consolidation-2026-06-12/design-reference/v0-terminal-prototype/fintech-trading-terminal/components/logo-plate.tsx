import { cn } from '@/lib/utils'

export function LogoPlate({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-gold/20 bg-gradient-to-b from-card to-background px-3 py-2.5',
        collapsed && 'justify-center px-0',
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[5px] border border-gold/40 bg-background">
        <span className="font-mono text-base font-bold tracking-tight text-gold">
          YT
        </span>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            YucaTanaTrades
          </span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-muted">
            Command Center
          </span>
        </div>
      )}
    </div>
  )
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusPill } from '@/components/status-pill'
import { cn } from '@/lib/utils'

export function MarketTable({
  symbols,
  columns,
}: {
  symbols: { ticker: string; name: string }[]
  columns: string[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[220px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Instrument
            </TableHead>
            {columns.map((c) => (
              <TableHead
                key={c}
                className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                {c}
              </TableHead>
            ))}
            <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Feed
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {symbols.map((s, i) => (
            <TableRow
              key={s.ticker}
              className={cn(
                'border-border transition-colors hover:bg-accent/40',
                i % 2 === 1 && 'bg-secondary/20',
              )}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md border border-border bg-background font-mono text-[10px] font-semibold text-gold-muted">
                    {s.ticker.slice(0, 3)}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {s.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.name}
                    </span>
                  </div>
                </div>
              </TableCell>
              {columns.map((c) => (
                <TableCell
                  key={c}
                  className="text-right font-mono text-sm tabular-nums text-muted-foreground/40"
                >
                  —
                </TableCell>
              ))}
              <TableCell className="text-right">
                <StatusPill status="unavailable" dot={false}>
                  No Data
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

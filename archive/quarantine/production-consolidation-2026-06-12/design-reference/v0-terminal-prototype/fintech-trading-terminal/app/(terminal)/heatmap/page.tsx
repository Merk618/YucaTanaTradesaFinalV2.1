import { Flame, Sparkles, RefreshCw, Maximize2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const sectors = [
  { name: 'Technology', span: 'col-span-2 row-span-2' },
  { name: 'Financials', span: 'col-span-1 row-span-1' },
  { name: 'Healthcare', span: 'col-span-1 row-span-2' },
  { name: 'Energy', span: 'col-span-1 row-span-1' },
  { name: 'Cons. Disc.', span: 'col-span-1 row-span-1' },
  { name: 'Industrials', span: 'col-span-1 row-span-1' },
  { name: 'Comm. Svcs', span: 'col-span-2 row-span-1' },
  { name: 'Utilities', span: 'col-span-1 row-span-1' },
  { name: 'Materials', span: 'col-span-1 row-span-1' },
  { name: 'Real Estate', span: 'col-span-1 row-span-1' },
  { name: 'Cons. Staples', span: 'col-span-1 row-span-1' },
]

const signalRows = [
  'Momentum Regime',
  'Volatility Cluster',
  'Breadth Thrust',
  'Mean Reversion',
  'Liquidity Stress',
]

export default function HeatmapPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Intelligence / MomentumAI"
        title="AI Heatmap"
        description="Machine-ranked market structure across sectors and factors. MomentumAI scores require a connected market data provider."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status="offline">Model Offline</StatusPill>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border bg-card"
            >
              <RefreshCw className="size-3.5" /> Recompute
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs defaultValue="sectors">
          <TabsList className="bg-card">
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="factors">Factors</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select defaultValue="momentum">
            <SelectTrigger className="h-9 w-40 border-border bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="momentum">Momentum Score</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="volatility">Volatility</SelectItem>
              <SelectItem value="volume">Relative Volume</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="1d">
            <SelectTrigger className="h-9 w-28 border-border bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="1w">1 Week</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Heatmap grid */}
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between border-b border-border py-3">
            <CardTitle className="text-sm font-medium">
              Sector Momentum Map
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="font-mono text-[10px] text-muted-foreground">
                  Weak
                </span>
                <div className="flex h-2 w-24 overflow-hidden rounded-full">
                  <span className="flex-1 bg-negative/50" />
                  <span className="flex-1 bg-muted" />
                  <span className="flex-1 bg-gold/50" />
                  <span className="flex-1 bg-positive/50" />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Strong
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label="Expand"
              >
                <Maximize2 className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid auto-rows-[88px] grid-cols-3 gap-2 sm:grid-cols-4">
              {sectors.map((s) => (
                <div
                  key={s.name}
                  className={`${s.span} group relative flex flex-col justify-between overflow-hidden rounded-md border border-border bg-secondary/30 p-3 transition-colors hover:border-gold/30`}
                >
                  <span className="text-xs font-medium text-foreground/80">
                    {s.name}
                  </span>
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-lg tabular-nums text-muted-foreground/40">
                      —
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                      No Data
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Signal rail */}
        <div className="flex flex-col gap-4">
          <Card className="border-gold/25 bg-gradient-to-b from-card to-background">
            <CardHeader className="flex-row items-center gap-2.5 py-3">
              <div className="flex size-8 items-center justify-center rounded-md border border-gold/40 bg-background">
                <Sparkles className="size-4 text-gold" />
              </div>
              <div className="flex flex-col leading-none">
                <CardTitle className="text-sm font-medium">
                  MomentumAI Signals
                </CardTitle>
                <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Awaiting data source
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {signalRows.map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2.5"
                >
                  <span className="text-xs text-foreground/80">{row}</span>
                  <StatusPill status="unavailable" dot={false}>
                    Unavailable
                  </StatusPill>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">
                Top Movers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Flame}
                compact
                title="Rankings Offline"
                description="Ranked movers populate once the model receives live data."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

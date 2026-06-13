import {
  CandlestickChart,
  Search,
  Maximize2,
  Settings2,
  Plus,
  LineChart,
  BarChart3,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W']
const watchlist = [
  'AAPL',
  'MSFT',
  'NVDA',
  'BTC',
  'ETH',
  'SPY',
  'QQQ',
  'TSLA',
]
const tools = [
  { label: 'Candles', icon: CandlestickChart, active: true },
  { label: 'Line', icon: LineChart, active: false },
  { label: 'Volume', icon: BarChart3, active: false },
]

export default function ChartsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Markets / Analysis"
        title="Charts"
        description="Multi-timeframe charting workspace with indicators and drawing tools. Select an instrument and connect a data source to render."
      />

      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <div className="relative w-44">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Symbol"
            className="h-8 border-border bg-background pl-8 font-mono text-xs"
          />
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-1">
          {timeframes.map((t, i) => (
            <Button
              key={t}
              variant={i === 5 ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 min-w-9 px-2 font-mono text-xs',
                i === 5
                  ? 'bg-gold text-primary-foreground hover:bg-gold/90'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </Button>
          ))}
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-1">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <Button
                key={tool.label}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 gap-1.5 px-2 text-xs',
                  tool.active
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{tool.label}</span>
              </Button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" /> Indicators
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="Chart settings"
          >
            <Settings2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="Fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Workspace grid */}
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex-row items-center justify-between border-b border-border py-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-semibold text-foreground">
                  No Symbol Selected
                </span>
                <StatusPill status="offline">Provider Offline</StatusPill>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                O — H — L — C —
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <EmptyState
                icon={CandlestickChart}
                className="min-h-[440px] rounded-none border-0"
                title="Chart Unavailable"
                description="Select an instrument and connect a market data provider to render price action, volume, and indicators."
              />
            </CardContent>
          </Card>

          {/* Indicator pane */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border py-2.5">
              <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Indicator Pane · RSI / MACD
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <EmptyState
                compact
                className="min-h-[120px] rounded-none border-0"
                title="No Indicator Data"
                description="Lower-study indicators render once a data source is connected."
              />
            </CardContent>
          </Card>
        </div>

        {/* Watchlist rail */}
        <Card className="hidden border-border bg-card xl:block">
          <CardHeader className="flex-row items-center justify-between border-b border-border py-3">
            <CardTitle className="text-sm font-medium">Watchlist</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-label="Add symbol"
            >
              <Plus className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-col">
              {watchlist.map((sym) => (
                <button
                  key={sym}
                  className="flex items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="font-mono text-sm text-foreground">
                    {sym}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground/40">
                    —
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

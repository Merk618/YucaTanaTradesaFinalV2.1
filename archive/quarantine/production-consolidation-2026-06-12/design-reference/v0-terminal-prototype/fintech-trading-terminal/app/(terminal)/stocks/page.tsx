import { TrendingUp, Filter, RefreshCw, Star } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatStrip } from '@/components/stat-strip'
import { MarketTable } from '@/components/market-table'
import { StatusPill } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const indexStats = [
  { label: 'S&P 500', hint: 'Index feed offline' },
  { label: 'Nasdaq 100', hint: 'Index feed offline' },
  { label: 'Dow Jones', hint: 'Index feed offline' },
  { label: 'Russell 2000', hint: 'Index feed offline' },
  { label: 'VIX', hint: 'Index feed offline' },
  { label: 'Advancers', hint: 'Breadth offline' },
]

const watchlist = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'META', name: 'Meta Platforms' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
]

const columns = ['Last', 'Chg', 'Chg %', 'Bid', 'Ask', 'Volume']

export default function StocksPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Markets / Equities"
        title="Stocks"
        description="Equity market monitor across indices, watchlists, and movers. Connect a provider to stream quotes."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status="offline">Provider Offline</StatusPill>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border bg-card"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      <StatStrip stats={indexStats} />

      <Tabs defaultValue="watchlist" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-card">
            <TabsTrigger value="watchlist" className="gap-1.5">
              <Star className="size-3.5" /> Watchlist
            </TabsTrigger>
            <TabsTrigger value="gainers">Gainers</TabsTrigger>
            <TabsTrigger value="losers">Losers</TabsTrigger>
            <TabsTrigger value="active">Most Active</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border bg-card"
          >
            <Filter className="size-3.5" /> Filters
          </Button>
        </div>

        <TabsContent value="watchlist">
          <MarketTable symbols={watchlist} columns={columns} />
        </TabsContent>
        <TabsContent value="gainers">
          <EmptyState
            icon={TrendingUp}
            title="Gainers Unavailable"
            description="Top gaining equities will appear here once a market data provider is connected."
          />
        </TabsContent>
        <TabsContent value="losers">
          <EmptyState
            title="Losers Unavailable"
            description="Top declining equities will appear here once a market data provider is connected."
          />
        </TabsContent>
        <TabsContent value="active">
          <EmptyState
            title="Most Active Unavailable"
            description="Highest volume equities will appear here once a market data provider is connected."
          />
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Sector Performance
            </CardTitle>
            <StatusPill status="unavailable" dot={false}>
              Unavailable
            </StatusPill>
          </CardHeader>
          <CardContent>
            <EmptyState
              compact
              title="Sector Map Offline"
              description="Sector-level performance breakdown requires a connected equities provider."
            />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Market News</CardTitle>
            <StatusPill status="unavailable" dot={false}>
              Unavailable
            </StatusPill>
          </CardHeader>
          <CardContent>
            <EmptyState
              compact
              title="News Feed Offline"
              description="Connect a news provider to surface headlines."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

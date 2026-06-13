import { Bitcoin, RefreshCw, Star, Layers } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatStrip } from '@/components/stat-strip'
import { MarketTable } from '@/components/market-table'
import { StatusPill } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const globalStats = [
  { label: 'Total Mkt Cap', hint: 'Aggregator offline' },
  { label: '24h Volume', hint: 'Aggregator offline' },
  { label: 'BTC Dominance', hint: 'Aggregator offline' },
  { label: 'ETH Dominance', hint: 'Aggregator offline' },
  { label: 'Fear & Greed', hint: 'Index offline' },
  { label: 'Active Pairs', hint: 'Exchange offline' },
]

const assets = [
  { ticker: 'BTC', name: 'Bitcoin' },
  { ticker: 'ETH', name: 'Ethereum' },
  { ticker: 'SOL', name: 'Solana' },
  { ticker: 'XRP', name: 'XRP' },
  { ticker: 'ADA', name: 'Cardano' },
  { ticker: 'AVAX', name: 'Avalanche' },
  { ticker: 'LINK', name: 'Chainlink' },
]

const columns = ['Last', '24h Chg', '24h %', 'High', 'Low', 'Volume']

export default function CryptoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Markets / Digital Assets"
        title="Crypto"
        description="Digital asset monitor for spot pairs, dominance, and on-chain metrics. Connect an exchange or aggregator to stream data."
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

      <StatStrip stats={globalStats} />

      <Tabs defaultValue="watchlist" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-card">
            <TabsTrigger value="watchlist" className="gap-1.5">
              <Star className="size-3.5" /> Watchlist
            </TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="defi">DeFi</TabsTrigger>
            <TabsTrigger value="derivatives">Derivatives</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border bg-card"
          >
            <Layers className="size-3.5" /> Pairs
          </Button>
        </div>

        <TabsContent value="watchlist">
          <MarketTable symbols={assets} columns={columns} />
        </TabsContent>
        <TabsContent value="trending">
          <EmptyState
            icon={Bitcoin}
            title="Trending Unavailable"
            description="Trending digital assets will appear here once a provider is connected."
          />
        </TabsContent>
        <TabsContent value="defi">
          <EmptyState
            title="DeFi Metrics Unavailable"
            description="TVL and protocol metrics require a connected on-chain data provider."
          />
        </TabsContent>
        <TabsContent value="derivatives">
          <EmptyState
            title="Derivatives Unavailable"
            description="Funding rates and open interest require a connected derivatives feed."
          />
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Funding Rates
            </CardTitle>
            <StatusPill status="unavailable" dot={false}>
              Unavailable
            </StatusPill>
          </CardHeader>
          <CardContent>
            <EmptyState
              compact
              title="Funding Offline"
              description="Perpetual funding rates require a connected derivatives feed."
            />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              On-Chain Flows
            </CardTitle>
            <StatusPill status="unavailable" dot={false}>
              Unavailable
            </StatusPill>
          </CardHeader>
          <CardContent>
            <EmptyState
              compact
              title="Flows Offline"
              description="Exchange inflow / outflow data requires an on-chain provider."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

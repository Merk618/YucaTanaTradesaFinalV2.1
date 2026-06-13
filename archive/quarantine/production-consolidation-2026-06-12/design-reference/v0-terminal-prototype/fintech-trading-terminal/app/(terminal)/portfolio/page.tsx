import { Briefcase, Download, PieChart, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatStrip } from '@/components/stat-strip'
import { StatusPill } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const portfolioStats = [
  { label: 'Total Value', hint: 'Account not linked' },
  { label: 'Day P/L', hint: 'Account not linked' },
  { label: 'Open P/L', hint: 'Account not linked' },
  { label: 'Cash', hint: 'Account not linked' },
  { label: 'Buying Power', hint: 'Account not linked' },
  { label: 'Positions', hint: 'Account not linked' },
]

const allocationColumns = ['Qty', 'Avg Cost', 'Mkt Value', 'Weight', 'P/L']

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Intelligence / Holdings"
        title="Portfolio"
        description="Consolidated holdings, allocation, and performance across linked accounts. Connect a brokerage data source to populate positions."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status="connect">Connect Account</StatusPill>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border bg-card"
            >
              <Download className="size-3.5" /> Export
            </Button>
          </div>
        }
      />

      <StatStrip stats={portfolioStats} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border bg-card xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Equity Curve
            </CardTitle>
            <StatusPill status="unavailable" dot={false}>
              Unavailable
            </StatusPill>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Wallet}
              title="No Account Linked"
              description="Link a brokerage or wallet to chart account value over time."
            />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Allocation</CardTitle>
            <StatusPill status="unavailable" dot={false}>
              Unavailable
            </StatusPill>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={PieChart}
              compact
              title="Allocation Offline"
              description="Asset class breakdown appears once holdings are available."
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="flex flex-col gap-4">
        <TabsList className="bg-card">
          <TabsTrigger value="positions" className="gap-1.5">
            <Briefcase className="size-3.5" /> Positions
          </TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Instrument
                  </TableHead>
                  {allocationColumns.map((c) => (
                    <TableHead
                      key={c}
                      className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={allocationColumns.length + 1}
                    className="py-0"
                  >
                    <EmptyState
                      compact
                      className="border-0 bg-transparent"
                      title="No Positions"
                      description="Connect a brokerage data source to view open positions."
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="orders">
          <EmptyState
            title="No Orders"
            description="Order history will appear here once an account is linked. This terminal is read-only and does not place trades."
          />
        </TabsContent>
        <TabsContent value="activity">
          <EmptyState
            title="No Activity"
            description="Transfers, dividends, and fills will appear here once an account is linked."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

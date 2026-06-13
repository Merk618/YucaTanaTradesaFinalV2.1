'use client'

import {
  KeyRound,
  ShieldCheck,
  Database,
  Cpu,
  Bell,
  Plus,
  Lock,
  Newspaper,
  Bitcoin,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const providers = [
  {
    name: 'Equities Market Data',
    desc: 'Real-time and historical US equity quotes',
    icon: TrendingUp,
    status: 'offline' as const,
    label: 'Provider Offline',
  },
  {
    name: 'Crypto Aggregator',
    desc: 'Spot pairs, dominance, and exchange data',
    icon: Bitcoin,
    status: 'offline' as const,
    label: 'Provider Offline',
  },
  {
    name: 'News & Sentiment',
    desc: 'Headlines, filings, and sentiment scoring',
    icon: Newspaper,
    status: 'connect' as const,
    label: 'Connect Data Source',
  },
  {
    name: 'MomentumAI Engine',
    desc: 'Model inference for heatmap and signals',
    icon: Sparkles,
    status: 'connect' as const,
    label: 'Connect Data Source',
  },
]

function VaultKeyRow({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {name}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Not configured"
            className="h-9 border-border bg-background pl-9 font-mono text-xs"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status="unavailable" dot={false}>
          No Key
        </StatusPill>
        <Button
          variant="outline"
          size="sm"
          className="border-border bg-card"
        >
          Save
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="System / Administration"
        title="Settings & Provider Vault"
        description="Manage data providers, API credentials, and terminal preferences. Credentials are stored encrypted and never displayed."
        actions={<StatusPill status="connect">No Active Providers</StatusPill>}
      />

      <Tabs defaultValue="providers" className="flex flex-col gap-5">
        <TabsList className="bg-card">
          <TabsTrigger value="providers" className="gap-1.5">
            <Database className="size-3.5" /> Providers
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-1.5">
            <KeyRound className="size-3.5" /> Vault
          </TabsTrigger>
          <TabsTrigger value="engine" className="gap-1.5">
            <Cpu className="size-3.5" /> Engine
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5">
            <Bell className="size-3.5" /> Preferences
          </TabsTrigger>
        </TabsList>

        {/* Providers */}
        <TabsContent value="providers" className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            {providers.map((p) => {
              const Icon = p.icon
              return (
                <Card key={p.name} className="border-border bg-card">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                      <Icon className="size-5 text-gold-muted" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {p.desc}
                          </p>
                        </div>
                        <StatusPill status={p.status}>{p.label}</StatusPill>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-8 bg-gold text-primary-foreground hover:bg-gold/90"
                        >
                          Connect
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground"
                        >
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Button
            variant="outline"
            className="gap-1.5 border-dashed border-border bg-card/40"
          >
            <Plus className="size-4" /> Add Custom Provider
          </Button>
        </TabsContent>

        {/* Vault */}
        <TabsContent value="vault">
          <Card className="border-border bg-card">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-gold" />
                <CardTitle className="text-sm font-medium">
                  Encrypted Credential Vault
                </CardTitle>
              </div>
              <StatusPill status="neutral" dot={false}>
                AES-256
              </StatusPill>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-5">
              <VaultKeyRow name="Equities API Key" />
              <VaultKeyRow name="Crypto API Key" />
              <VaultKeyRow name="News API Key" />
              <VaultKeyRow name="MomentumAI Token" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engine */}
        <TabsContent value="engine">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-sm font-medium">
                MomentumAI Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-2">
              {[
                {
                  title: 'Auto-recompute heatmap',
                  desc: 'Recalculate scores on each data refresh',
                },
                {
                  title: 'Signal notifications',
                  desc: 'Alert when regime or factor signals change',
                },
                {
                  title: 'Natural-language queries',
                  desc: 'Allow MomentumAI assistant to answer market questions',
                },
              ].map((row, i, arr) => (
                <div key={row.title}>
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-foreground">
                        {row.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.desc}
                      </span>
                    </div>
                    <Switch disabled />
                  </div>
                  {i < arr.length - 1 && <Separator className="bg-border" />}
                </div>
              ))}
              <p className="mt-2 rounded-md border border-border bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
                Engine controls are locked until a data source and MomentumAI
                token are connected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-sm font-medium">
                  Display
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-2">
                {[
                  'Compact density',
                  'Show market clock',
                  'Tabular numerals',
                ].map((row, i, arr) => (
                  <div key={row}>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-foreground">{row}</span>
                      <Switch defaultChecked={i !== 0} />
                    </div>
                    {i < arr.length - 1 && <Separator className="bg-border" />}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-sm font-medium">
                  Workspace
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Default landing page
                  </Label>
                  <Input
                    defaultValue="/stocks"
                    className="h-9 border-border bg-background font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Base currency
                  </Label>
                  <Input
                    defaultValue="USD"
                    className="h-9 border-border bg-background font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

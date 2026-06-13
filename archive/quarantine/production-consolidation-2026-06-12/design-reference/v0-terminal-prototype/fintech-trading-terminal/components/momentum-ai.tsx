'use client'

import { useState } from 'react'
import { Sparkles, X, ArrowUp, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const suggestions = [
  'Summarize today’s market regime',
  'Scan momentum across watchlist',
  'Explain the heatmap clusters',
]

export function MomentumAI() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open MomentumAI assistant"
        className={cn(
          'fixed bottom-5 right-5 z-40 flex size-13 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-card to-background shadow-lg shadow-black/40 transition-transform hover:scale-105',
          open && 'scale-0 opacity-0',
        )}
      >
        <Sparkles className="size-5 text-gold" />
        <span className="absolute -right-0.5 -top-0.5 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-gold" />
        </span>
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-5 right-5 z-40 flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-gold/25 bg-card shadow-2xl shadow-black/50 transition-all duration-200',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-b from-secondary/60 to-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md border border-gold/40 bg-background">
              <Sparkles className="size-4 text-gold" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-foreground">
                MomentumAI
              </span>
              <span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-muted-foreground" />
                Awaiting data source
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-background/60 p-3">
            <Activity className="mt-0.5 size-4 shrink-0 text-gold-muted" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              MomentumAI is offline. Connect a market data provider to enable
              live regime analysis, momentum scans, and natural-language market
              queries.
            </p>
          </div>

          <p className="px-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Suggested prompts
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                disabled
                className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-xs text-muted-foreground/70"
              >
                {s}
                <span className="font-mono text-[9px] uppercase text-muted-foreground/50">
                  Locked
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border p-3">
          <div className="relative">
            <Input
              disabled
              placeholder="Ask MomentumAI…"
              className="h-10 border-border bg-background pr-11 text-xs"
            />
            <Button
              size="icon"
              disabled
              className="absolute right-1 top-1 size-8 bg-gold text-primary-foreground hover:bg-gold/90"
              aria-label="Send"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

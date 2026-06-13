'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  Bell,
  Menu,
  X,
  Clock,
  ChevronDown,
  LifeBuoy,
} from 'lucide-react'
import { navSections } from '@/lib/nav'
import { LogoPlate } from '@/components/logo-plate'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function MarketClock() {
  return (
    <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 md:flex">
      <Clock className="size-3.5 text-muted-foreground" />
      <span className="font-mono text-xs text-muted-foreground">
        {'--:--:-- UTC'}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
        <span className="size-1.5 rounded-full bg-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Market Closed
        </span>
      </span>
    </div>
  )
}

export function TopBar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-md md:px-5">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search symbols, providers, views…"
          className="h-9 border-border bg-card pl-9 font-mono text-xs placeholder:text-muted-foreground/70"
        />
        <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-block">
          /
        </kbd>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
        <MarketClock />

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Support"
        >
          <LifeBuoy className="size-4.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" />
        </Button>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent">
            <div className="flex items-center gap-2">
              <Avatar className="size-7 border border-gold/30">
                <AvatarFallback className="bg-card font-mono text-[11px] text-gold">
                  OP
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start leading-none md:flex">
                <span className="text-xs font-medium text-foreground">
                  Operator
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Tier · Institutional
                </span>
              </div>
              <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Session
            </DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings">Provider Vault</Link>} />
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-negative focus:text-negative">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between p-3">
              <LogoPlate />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-5 overflow-y-auto px-3 pb-6 pt-2">
              {navSections.map((section) => (
                <div key={section.heading} className="flex flex-col gap-1">
                  <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {section.heading}
                  </p>
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + '/')
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4',
                            active ? 'text-gold' : 'text-muted-foreground',
                          )}
                        />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

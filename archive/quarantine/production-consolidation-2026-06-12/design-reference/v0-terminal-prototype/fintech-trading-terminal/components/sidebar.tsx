'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navSections } from '@/lib/nav'
import { LogoPlate } from '@/components/logo-plate'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex 2xl:w-[280px]">
      <div className="p-3">
        <LogoPlate />
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-5 pb-6 pt-2">
          {navSections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-1">
              <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {section.heading}
              </p>
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-0.5 shrink-0 rounded-full transition-colors',
                        active ? 'bg-gold' : 'bg-transparent',
                      )}
                      aria-hidden
                    />
                    <Icon
                      className={cn(
                        'size-4 shrink-0',
                        active
                          ? 'text-gold'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/40 px-3 py-2.5" />
            }
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-negative/60 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-negative" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-foreground">
                Data Feed
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                No source connected
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            Connect a market data provider in Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}

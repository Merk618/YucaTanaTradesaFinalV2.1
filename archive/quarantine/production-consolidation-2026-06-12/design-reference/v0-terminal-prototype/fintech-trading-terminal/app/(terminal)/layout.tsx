import type { ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/top-bar'
import { MomentumAI } from '@/components/momentum-ai'

export default function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[2400px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <MomentumAI />
    </div>
  )
}

import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Command center overview. Layout to be defined."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard Layout Pending"
        description="Dashboard content is defined separately. The terminal shell, navigation, and theme are in place."
      />
    </div>
  )
}

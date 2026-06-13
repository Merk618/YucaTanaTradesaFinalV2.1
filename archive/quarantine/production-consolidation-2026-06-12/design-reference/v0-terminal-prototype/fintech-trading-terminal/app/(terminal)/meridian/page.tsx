import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Compass } from 'lucide-react'

export default function MeridianPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Meridian"
        description="Meridian module. Layout to be defined."
      />
      <EmptyState
        icon={Compass}
        title="Meridian Layout Pending"
        description="Meridian content is defined separately. The terminal shell, navigation, and theme are in place."
      />
    </div>
  )
}

import {
  LayoutDashboard,
  TrendingUp,
  Bitcoin,
  Briefcase,
  CandlestickChart,
  Flame,
  Compass,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type NavSection = {
  heading: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Meridian', href: '/meridian', icon: Compass },
    ],
  },
  {
    heading: 'Markets',
    items: [
      { label: 'Stocks', href: '/stocks', icon: TrendingUp },
      { label: 'Crypto', href: '/crypto', icon: Bitcoin },
      { label: 'Charts', href: '/charts', icon: CandlestickChart },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
      { label: 'AI Heatmap', href: '/heatmap', icon: Flame },
    ],
  },
  {
    heading: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
]

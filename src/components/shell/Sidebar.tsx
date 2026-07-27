import {
  ChartBar,
  MapTrifold,
  Image as ImageIcon,
  BookOpen,
  Leaf,
  Calendar,
  Megaphone,
  Users,
  Trophy,
  GearSix,
  Question,
  ArrowSquareUpRight,
} from '@phosphor-icons/react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'

const navGroups = [
  {
    label: 'Discovery',
    items: [
      { icon: ChartBar, label: 'Analytics', path: '/analytics' },
      { icon: MapTrifold, label: 'CMS', path: '/destinations' },
      { icon: ImageIcon, label: 'Media Library', path: '/media' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { icon: BookOpen, label: 'LMS', path: '/lms' },
      { icon: Leaf, label: 'Conservation', path: '/conservation' },
      { icon: Calendar, label: 'Events', path: '/events' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Trophy, label: 'Challenges', path: '/challenges' },
      { icon: Megaphone, label: 'Campaigns', path: '/campaigns' },
      { icon: Users, label: 'User Management', path: '/users' },
    ],
  },
]

const pinnedItems = [
  { icon: GearSix, label: 'Settings' },
  { icon: Question, label: 'Support' },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarHeader className="px-5 py-6">
        <div className="font-sans text-2xl font-bold leading-none text-white">
          Eco-Explorer
        </div>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">
          Admin Portal
        </p>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-4">
        {navGroups.map((group, gi) => (
          <SidebarGroup key={gi} className="mb-4">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      tooltip={item.label}
                      className="rounded-lg text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      <Link to={item.path}>
                        <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="mt-auto space-y-2 px-3 pb-5">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold shadow-sm"
          style={{ backgroundColor: 'var(--amber)', color: 'var(--forest-deep)' }}
        >
          <ArrowSquareUpRight className="h-4 w-4" weight="bold" />
          Deploy AI Guardrails
        </button>
        <SidebarMenu>
          {pinnedItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton className="rounded-lg text-white/80 hover:bg-white/5 hover:text-white">
                <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                <span className="text-sm font-semibold">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

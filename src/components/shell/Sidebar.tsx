import {
  ChartBar,
  MapTrifold,
  Image as ImageIcon,
  BookOpen,
  Leaf,
  Calendar,
  Gear,
  Megaphone,
  Users,
  GearSix,
  Question,
  ArrowSquareUpRight,
} from '@phosphor-icons/react'
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
      { icon: ChartBar, label: 'Analytics', path: '/_authenticated/analytics' },
      { icon: MapTrifold, label: 'CMS', path: '/_authenticated/destinations' },
      { icon: ImageIcon, label: 'Media Library', path: '/_authenticated/media' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { icon: BookOpen, label: 'LMS', path: '/_authenticated/lms' },
      { icon: Leaf, label: 'Conservation', path: '/_authenticated/conservation' },
      { icon: Calendar, label: 'Events', path: '/_authenticated/events' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Gear, label: 'AI Config', path: '/_authenticated/ai-config' },
      { icon: Megaphone, label: 'Campaigns', path: '/_authenticated/campaigns' },
      { icon: Users, label: 'User Management', path: '/_authenticated/users' },
    ],
  },
]

const pinnedItems = [
  { icon: GearSix, label: 'Settings' },
  { icon: Question, label: 'Support' },
]

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={{ backgroundColor: '#154212' }}
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
                      isActive={false}
                      tooltip={item.label}
                      className="rounded-lg text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                      <span className="text-sm font-semibold">{item.label}</span>
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
          style={{ backgroundColor: '#fdc002', color: '#002b02' }}
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

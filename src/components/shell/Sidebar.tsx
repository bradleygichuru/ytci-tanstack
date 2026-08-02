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
  ChatDots,
  SignOut,
} from '@phosphor-icons/react'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
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
import { authClient } from '#/lib/auth-client'

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
      { icon: ChatDots, label: 'Comments', path: '/comments' },
      { icon: Megaphone, label: 'Campaigns', path: '/campaigns' },
      { icon: Users, label: 'User Management', path: '/users' },
    ],
  },
]

const pinnedItems = [
  { icon: GearSix, label: 'Settings', path: '/settings' },
]

export function AppSidebar() {
  const location = useLocation()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const user = session?.user

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarHeader className="px-5 py-6 bg-sidebar group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="font-sans text-2xl font-bold leading-none text-sidebar-foreground">
            YTC Explorer
          </div>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/60">
            Admin Portal
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-4 group-data-[collapsible=icon]:px-1">
        {navGroups.map((group, gi) => (
          <SidebarGroup key={gi} className="mb-4">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
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
                      className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      <Link to={item.path} style={{ color: 'var(--sidebar-foreground)' }}>
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

      <SidebarFooter className="mt-auto space-y-1 px-3 pb-5 bg-sidebar group-data-[collapsible=icon]:px-1">
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {user.image ? (
              <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
                <span className="text-xs font-bold text-sidebar-foreground">
                  {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {user.name ?? 'User'}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {user.email}
              </p>
            </div>
          </div>
        )}
        <SidebarMenu>
          {pinnedItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.label}
                className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Link to={item.path} style={{ color: 'var(--sidebar-foreground)' }}>
                  <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => { try { await authClient.signOut() } catch { /* ignore, redirect anyway */ } await router.navigate({ to: '/login' }) }}
              tooltip="Sign Out"
              className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <SignOut className="h-[18px] w-[18px]" weight="duotone" />
              <span className="text-sm font-semibold">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

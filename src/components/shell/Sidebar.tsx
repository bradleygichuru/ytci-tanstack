import { SignOut } from '@phosphor-icons/react'
import { Link, useLocation, useRouteContext, useRouter } from '@tanstack/react-router'
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
import { normaliseRole } from '#/lib/contracts/roles'
import { useFlags } from '#/lib/flags'
import {
  PINNED_ITEMS,
  visibleSections,
  type NavItem,
} from '#/lib/navigation/sections'

/**
 * Sectioned sidebar.
 *
 * Renders `NAV_SECTIONS` from the registry — this component owns no entries. A
 * feature stream adds its entry to the registry; it never edits this file.
 */
export function AppSidebar() {
  const location = useLocation()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const routeContext = useRouteContext({ from: '/_authenticated' })
  const user = session?.user
  const role = normaliseRole(
    (user as { role?: unknown } | undefined)?.role ?? routeContext.user?.role,
  )
  const flags = useFlags()

  const visibleGroups = visibleSections({ role, flags })

  const isActive = (item: NavItem) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + '/')

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 py-6 bg-sidebar group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img
            src="/logo.png"
            alt="YTC Explorer logo"
            className="h-9 w-9 shrink-0 rounded-xl object-cover"
          />
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="font-sans text-2xl font-bold leading-none text-sidebar-foreground">
              YTC Explorer
            </div>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/60">
              Admin Portal
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-4 group-data-[collapsible=icon]:px-1">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.key} className="mb-4">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item)}
                      tooltip={item.label}
                      className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      <Link to={item.path} style={{ color: 'var(--sidebar-foreground)' }}>
                        <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                        <span className="flex-1 text-sm font-semibold">{item.label}</span>
                        {item.status === 'shell' ? (
                          <span
                            className="rounded-full border border-sidebar-foreground/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
                            title={item.owner ? `Owned by ${item.owner}` : 'Shell placeholder'}
                          >
                            Soon
                          </span>
                        ) : null}
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
              <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
            </div>
          </div>
        )}
        <SidebarMenu>
          {PINNED_ITEMS.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.label}
                className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Link to={item.path} className="min-w-0" style={{ color: 'var(--sidebar-foreground)' }}>
                  <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                try {
                  await authClient.signOut()
                } catch {
                  /* ignore, redirect anyway */
                }
                await router.navigate({ to: '/login' })
              }}
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

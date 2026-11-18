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
  Robot,
  Storefront,
  FilmSlate,
} from "@phosphor-icons/react";
import {
  Link,
  useLocation,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
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
} from "#/components/ui/sidebar";
import { authClient } from "#/lib/auth-client";
import { hasPermission, type ResourceKey } from "#/lib/authz";

type NavItem = {
  icon: typeof ChartBar;
  label: string;
  path: string;
  resource?: ResourceKey;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Discovery",
    items: [
      {
        icon: ChartBar,
        label: "Analytics",
        path: "/analytics",
        resource: "analytics",
      },
      {
        icon: MapTrifold,
        label: "CMS",
        path: "/destinations",
        resource: "destinations",
      },
      {
        icon: FilmSlate,
        label: "Then & Now",
        path: "/then-now",
        resource: "thenNow",
      },
      {
        icon: ImageIcon,
        label: "Media Library",
        path: "/media",
        resource: "media",
      },
    ],
  },
  {
    label: "Engagement",
    items: [
      { icon: BookOpen, label: "LMS", path: "/lms", resource: "lms" },
      {
        icon: Leaf,
        label: "Conservation",
        path: "/conservation",
        resource: "conservation",
      },
      { icon: Calendar, label: "Events", path: "/events", resource: "events" },
      {
        icon: Storefront,
        label: "Marketplace",
        path: "/marketplace",
        resource: "marketplace",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        icon: Trophy,
        label: "Challenges",
        path: "/challenges",
        resource: "challenges",
      },
      {
        icon: ChatDots,
        label: "Comments",
        path: "/comments",
        resource: "comments",
      },
      {
        icon: Megaphone,
        label: "Campaigns",
        path: "/campaigns",
        resource: "campaigns",
      },
      {
        icon: Users,
        label: "User Management",
        path: "/users",
        resource: "user",
      },
      {
        icon: Robot,
        label: "AI Config",
        path: "/ai-config",
        resource: "aiConfig",
      },
    ],
  },
];

const pinnedItems = [{ icon: GearSix, label: "Settings", path: "/settings" }];

export function AppSidebar() {
  const location = useLocation();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const routeContext = useRouteContext({ from: "/_authenticated" });
  const user = session?.user;
  const role =
    (user as { role?: string } | undefined)?.role ?? routeContext.user?.role;
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.resource || hasPermission(role, item.resource, ["read"]),
      ),
    }))
    .filter((group) => group.items.length > 0);

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
        {visibleGroups.map((group, gi) => (
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
                      isActive={
                        location.pathname === item.path ||
                        location.pathname.startsWith(item.path + "/")
                      }
                      tooltip={item.label}
                      className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    >
                      <Link
                        to={item.path}
                        style={{ color: "var(--sidebar-foreground)" }}
                      >
                        <item.icon
                          className="h-[18px] w-[18px]"
                          weight="duotone"
                        />
                        <span className="text-sm font-semibold">
                          {item.label}
                        </span>
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
              <img
                src={user.image}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
                <span className="text-xs font-bold text-sidebar-foreground">
                  {user.name?.charAt(0).toUpperCase() ??
                    user.email?.charAt(0).toUpperCase() ??
                    "?"}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {user.name ?? "User"}
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
                <Link
                  to={item.path}
                  style={{ color: "var(--sidebar-foreground)" }}
                >
                  <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                try {
                  await authClient.signOut();
                } catch {
                  /* ignore, redirect anyway */
                }
                await router.navigate({ to: "/login" });
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
  );
}

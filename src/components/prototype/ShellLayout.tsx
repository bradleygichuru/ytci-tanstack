// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.
// Design system tokens: see docs/stitch-design-system.md (sourced from Stitch project 17181829470439098105).

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
  MagnifyingGlass,
  Bell,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '#/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Input } from '#/components/ui/input'
import ThemeToggle from '#/components/ThemeToggle'

const navItems = [
  { icon: ChartBar, label: 'Analytics' },
  { icon: MapTrifold, label: 'CMS' },
  { icon: ImageIcon, label: 'Media Library' },
]

const navItems2 = [
  { icon: BookOpen, label: 'LMS' },
  { icon: Leaf, label: 'Conservation' },
  { icon: Calendar, label: 'Events' },
]

const navItems3 = [
  { icon: Gear, label: 'AI Config' },
  { icon: Megaphone, label: 'Campaigns' },
  { icon: Users, label: 'User Management' },
]

const pinnedItems = [
  { icon: GearSix, label: 'Settings' },
  { icon: Question, label: 'Support' },
]

export function ShellLayout({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  title: string
  subtitle?: string
  tabs?: { label: string }[]
  activeTab?: string
  onTabChange?: (label: string) => void
  children: ReactNode
}) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full" style={{ backgroundColor: 'var(--bg)' }}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          style={{ backgroundColor: 'var(--forest)' }}
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
            {[navItems, navItems2, navItems3].map((group, gi) => (
              <SidebarGroup key={gi} className="mb-4">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.map((item) => {
                      const isActive = item.label === 'Media Library'
                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            className={
                              isActive
                                ? 'rounded-lg text-[var(--forest-deep)] hover:text-[var(--forest-deep)]'
                                : 'rounded-lg text-white/80 hover:bg-white/5 hover:text-white'
                            }
                            style={
                              isActive
                                ? { backgroundColor: 'var(--amber)' }
                                : undefined
                            }
                          >
                            <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                            <span className="text-sm font-semibold">{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
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

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center gap-6 border-b border-[var(--surface-4)] bg-white px-8">
            <div className="font-sans text-lg font-bold tracking-tight" style={{ color: 'var(--on-surface)' }}>
              Admin Command Center
            </div>
            {tabs && tabs.length > 0 && (
              <div className="flex gap-6">
                {tabs.map((tab) => {
                  const isActive = tab.label === activeTab
                  return (
                    <button
                      key={tab.label}
                      onClick={() => onTabChange?.(tab.label)}
                      className={`border-b-2 pb-1 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'border-[var(--forest)] text-[var(--on-surface)]'
                          : 'border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="ml-auto flex items-center gap-4">
              <div className="relative">
                <MagnifyingGlass
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]"
                  weight="duotone"
                />
                <Input
                  placeholder="Search tours..."
                  className="h-9 w-64 rounded-md border border-[var(--outline-muted)] bg-white pl-9 text-sm placeholder:text-[var(--on-surface-variant)] focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)]"
                />
              </div>
              <button className="relative rounded-full p-1.5 text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)] hover:text-[var(--on-surface)]">
                <Bell className="h-5 w-5" weight="duotone" />
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--error)] text-[10px] font-bold text-white">
                  3
                </span>
              </button>
              <ThemeToggle />
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src="https://api.dicebear.com/9.x/initials/svg?seed=AU" />
                <AvatarFallback>AU</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-8 py-8">
            {(title || subtitle) && (
              <div className="mb-8">
                <h1 className="font-sans text-3xl font-bold tracking-tight" style={{ color: 'var(--on-surface)' }}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </main>

          <footer
            className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[var(--surface-4)] px-8 py-4 text-xs text-[var(--on-surface-variant)]"
          >
            <span>© 2024 Eco-Tourism Explorer. All rights reserved.</span>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-[var(--on-surface)]">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--on-surface)]">Terms of Service</a>
              <a href="#" className="hover:text-[var(--on-surface)]">AI Ethics Guardrails</a>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}

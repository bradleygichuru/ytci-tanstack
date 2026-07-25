// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.

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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '#/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Input } from '#/components/ui/input'
import ThemeToggle from '#/components/ThemeToggle'

const navGroups = [
  {
    label: '',
    items: [
      { icon: ChartBar, label: 'Analytics' },
      { icon: MapTrifold, label: 'CMS' },
      { icon: ImageIcon, label: 'Media Library' },
    ],
  },
  {
    label: '',
    items: [
      { icon: BookOpen, label: 'LMS' },
      { icon: Leaf, label: 'Conservation' },
      { icon: Calendar, label: 'Events' },
    ],
  },
  {
    label: '',
    items: [
      { icon: Gear, label: 'AI Config' },
      { icon: Megaphone, label: 'Campaigns' },
      { icon: Users, label: 'User Management' },
    ],
  },
]

const pinnedItems = [
  { icon: GearSix, label: 'Settings' },
  { icon: Question, label: 'Support' },
]

const SIDEBAR_BG = '#0a2e1c'
const AMBER = '#e8a948'
const MUTED_GREEN = '#9bb1a3'
const CREAM = '#fbf6e9'

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
      <div
        className="flex min-h-screen w-full"
        style={{ backgroundColor: CREAM }}
      >
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          style={{ backgroundColor: SIDEBAR_BG }}
        >
          <SidebarHeader className="px-5 py-6">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold leading-none text-emerald-50">
                Eco-Explorer
              </span>
            </div>
            <p
              className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ color: MUTED_GREEN }}
            >
              Admin Portal
            </p>
          </SidebarHeader>

          <SidebarContent className="px-3 pt-2">
            {navGroups.map((group, gi) => (
              <SidebarGroup key={gi}>
                {group.label && (
                  <SidebarGroupLabel
                    className="px-2 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: MUTED_GREEN }}
                  >
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive = item.label === 'Media Library'
                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            className={
                              isActive
                                ? `text-neutral-900 hover:text-neutral-900 data-[active=true]:text-neutral-900`
                                : 'text-emerald-100/70 hover:bg-white/5 hover:text-emerald-50'
                            }
                            style={
                              isActive
                                ? { backgroundColor: AMBER, color: '#1a1a1a' }
                                : undefined
                            }
                          >
                            <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="mt-auto space-y-2 px-3 pb-4">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: AMBER, color: '#1a1a1a' }}
            >
              <ArrowSquareUpRight className="h-4 w-4" weight="bold" />
              Deploy AI Guardrails
            </button>
            <SidebarMenu>
              {pinnedItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton className="text-emerald-100/70 hover:bg-white/5 hover:text-emerald-50">
                    <item.icon className="h-[18px] w-[18px]" weight="duotone" />
                    <span className="text-sm">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center gap-6 border-b border-neutral-200/60 bg-white px-8">
            <div className="font-serif text-lg font-semibold tracking-tight text-neutral-800">
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
                      className={
                        isActive
                          ? 'border-b-2 border-neutral-900 pb-1 text-sm font-medium text-neutral-900'
                          : 'border-b-2 border-transparent pb-1 text-sm font-medium text-neutral-500 hover:text-neutral-700'
                      }
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
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  weight="duotone"
                />
                <Input
                  placeholder="Search tours..."
                  className="h-9 w-64 rounded-full border-0 bg-neutral-100 pl-9 text-sm placeholder:text-neutral-400"
                />
              </div>
              <button className="relative rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700">
                <Bell className="h-5 w-5" weight="duotone" />
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
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

          <main className="min-w-0 flex-1 px-8 py-6">{children}</main>

          <footer
            className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/40 px-8 py-4 text-xs"
            style={{ color: MUTED_GREEN }}
          >
            <span>© 2024 Eco-Tourism Explorer. All rights reserved.</span>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-neutral-700">Privacy Policy</a>
              <a href="#" className="hover:text-neutral-700">Terms of Service</a>
              <a href="#" className="hover:text-neutral-700">AI Ethics Guardrails</a>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}

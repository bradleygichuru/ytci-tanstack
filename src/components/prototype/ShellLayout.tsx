// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.

import {
  ChartBar,
  MapTrifold,
  Image,
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
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import ThemeToggle from '#/components/ThemeToggle'

const navGroups = [
  {
    label: 'Discovery',
    items: [
      { icon: ChartBar, label: 'Analytics' },
      { icon: MapTrifold, label: 'Destinations' },
      { icon: Image, label: 'Media & UGC', active: true },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { icon: BookOpen, label: 'LMS' },
      { icon: Leaf, label: 'Conservation' },
      { icon: Calendar, label: 'Events' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Gear, label: 'AI Config' },
      { icon: Megaphone, label: 'Campaigns' },
      { icon: Users, label: 'Users' },
    ],
  },
]

const pinnedItems = [
  { icon: GearSix, label: 'Settings' },
  { icon: Question, label: 'Support' },
]

export function ShellLayout({
  title,
  tabs,
  children,
  leftSlot,
}: {
  title: string
  tabs?: { label: string; active?: boolean }[]
  children: ReactNode
  leftSlot?: ReactNode
}) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="px-4 py-5">
            <div className="flex items-center gap-2">
              <span className="text-xl font-serif font-bold tracking-tight text-emerald-100">Eco-Explorer</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500">Admin Portal</p>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="px-4 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          isActive={item.active}
                          tooltip={item.label}
                          className={
                            item.active
                              ? 'bg-amber-400/90 text-neutral-900 hover:bg-amber-400 hover:text-neutral-900 data-[active=true]:bg-amber-400 data-[active=true]:text-neutral-900'
                              : 'text-emerald-200/70 hover:bg-emerald-800/50 hover:text-emerald-100'
                          }
                        >
                          <item.icon className="h-5 w-5" weight="duotone" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-emerald-700/30 px-3 py-4">
            <div className="mb-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-3 text-center">
              <p className="mb-1 text-[11px] font-medium text-amber-300">Deploy AI Guardrails</p>
              <ArrowSquareUpRight className="mx-auto h-5 w-5 text-amber-400" weight="bold" />
            </div>
            <SidebarMenu>
              {pinnedItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton className="text-emerald-200/70 hover:bg-emerald-800/50 hover:text-emerald-100">
                    <item.icon className="h-5 w-5" weight="duotone" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col bg-amber-50/60">
          <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
            <h1 className="text-lg font-semibold text-neutral-800">{title}</h1>
            {tabs && tabs.length > 0 && (
              <div className="ml-6 flex gap-1 rounded-lg bg-amber-100/60 p-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    className={
                      tab.active
                        ? 'rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm'
                        : 'rounded-md px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700'
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {leftSlot}
            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" weight="duotone" />
                <Input placeholder="Search..." className="h-9 w-56 rounded-lg border border-neutral-200 bg-neutral-50 pl-9 text-sm" />
              </div>
              <button className="relative rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700">
                <Bell className="h-5 w-5" weight="duotone" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
              </button>
              <ThemeToggle />
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src="https://api.dicebear.com/9.x/initials/svg?seed=AU" />
                <AvatarFallback>AU</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

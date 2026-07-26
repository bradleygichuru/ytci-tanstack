import { SidebarProvider } from '#/components/ui/sidebar'
import { AppSidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { ReactNode } from 'react'

interface AdminShellProps {
  title: string
  subtitle?: string
  tabs?: { label: string }[]
  activeTab?: string
  onTabChange?: (label: string) => void
  children: ReactNode
}

export function AdminShell({ title, subtitle, tabs, activeTab, onTabChange, children }: AdminShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full" style={{ backgroundColor: '#f8f9fa' }}>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          <main className="min-w-0 flex-1 px-8 py-8">
            {(title || subtitle) && (
              <div className="mb-8">
                <h1 className="font-sans text-3xl font-bold tracking-tight text-[#191c1d]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-[#42493e]">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </main>
          <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#e7e8e9] bg-[#f8f9fa] px-4 py-4 text-xs text-[#42493e] sm:px-6 lg:px-8">
            <span>© 2024 Eco-Tourism Explorer. All rights reserved.</span>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-[#191c1d]">Privacy Policy</a>
              <a href="#" className="hover:text-[#191c1d]">Terms of Service</a>
              <a href="#" className="hover:text-[#191c1d]">AI Ethics Guardrails</a>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}

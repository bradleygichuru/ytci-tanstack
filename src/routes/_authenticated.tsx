import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import { AppSidebar } from '../components/shell/Sidebar'
import { Toaster } from '../components/ui/sonner'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    if (context.user.role === 'user') {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-12 items-center border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}

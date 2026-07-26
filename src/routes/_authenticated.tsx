import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SidebarProvider } from '../components/ui/sidebar'
import { AppSidebar } from '../components/shell/Sidebar'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    // TODO: wire real session context (T10). For now, stub allows all.
    // if (!context.user) {
    //   throw redirect({ to: '/login', search: { redirect: location.href } })
    // }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full" style={{ backgroundColor: '#f8f9fa' }}>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  )
}

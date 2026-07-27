import { MagnifyingGlass, Bell } from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import ThemeToggle from '#/components/ThemeToggle'

interface TopBarProps {
  tabs?: { label: string }[]
  activeTab?: string
  onTabChange?: (label: string) => void
}

export function TopBar({ tabs, activeTab, onTabChange }: TopBarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:gap-6 sm:px-6 lg:px-8">
      {tabs && tabs.length > 0 && (
        <div className="flex gap-3 sm:gap-6">
          {tabs.map((tab) => {
            const isActive = tab.label === activeTab
            return (
              <button
                key={tab.label}
                onClick={() => onTabChange?.(tab.label)}
                className={`border-b-2 pb-1 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
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
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            weight="duotone"
          />
          <input
            placeholder="Search tours..."
            className="h-9 w-36 rounded-md border border-border bg-card pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring sm:w-48 lg:w-64"
          />
        </div>
        <button className="relative rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" weight="duotone" />
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
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
  )
}

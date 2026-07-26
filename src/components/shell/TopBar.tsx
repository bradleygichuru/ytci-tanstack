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
    <header className="flex h-16 items-center gap-6 border-b border-[#e7e8e9] bg-white px-8">
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
                    ? 'border-[#154212] text-[#191c1d]'
                    : 'border-transparent text-[#42493e] hover:text-[#191c1d]'
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
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#42493e]"
            weight="duotone"
          />
          <input
            placeholder="Search tours..."
            className="h-9 w-64 rounded-md border border-[#c2c9bb] bg-white pl-9 text-sm text-[#191c1d] outline-none placeholder:text-[#42493e] focus:border-[#154212] focus:ring-1 focus:ring-[#154212]"
          />
        </div>
        <button className="relative rounded-full p-1.5 text-[#42493e] hover:bg-[#f3f4f5] hover:text-[#191c1d]">
          <Bell className="h-5 w-5" weight="duotone" />
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ba1a1a] text-[10px] font-bold text-white">
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

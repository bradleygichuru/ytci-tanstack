import { Link, useLocation } from '@tanstack/react-router'

const TABS = [
  { key: 'stories', label: 'Stories', to: '/audio-stories' },
  { key: 'review', label: 'Review', to: '/audio-stories/review' },
  { key: 'collections', label: 'Collections', to: '/audio-stories/collections' },
] as const

export function AudioStoryTabs({ reviewCount }: { reviewCount?: number }) {
  const location = useLocation()

  return (
    <nav
      aria-label="Audio Stories sections"
      className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-1"
    >
      {TABS.map((tab) => {
        const active = tab.to === '/audio-stories'
          ? location.pathname === tab.to
          : location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`)
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key === 'review' && reviewCount ? (
              <span className="rounded-full bg-[var(--amber-bg)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--amber-deep)]">
                {reviewCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Sectioned navigation registry — the single list of admin sections and items.
 *
 * The sidebar renders this registry; it owns no entries of its own. A feature
 * stream adds its route and one entry here (or, for a brand-new surface, flips
 * the entry's flag), and does not edit the sidebar, the root layout or shared
 * components.
 *
 * Visibility is the conjunction of three independent gates:
 *   - the surface flag (new surfaces ship dark)
 *   - the canonical permission from roles.v1.yaml
 *   - the legacy RBAC resource, for pre-contract screens that have not migrated
 */
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
  Robot,
  Storefront,
  FilmSlate,
  Sparkle,
  type Icon,
} from '@phosphor-icons/react'
import {
  canAccessAdmin,
  roleHasPermission,
  type Permission,
  type Role,
} from '#/lib/contracts/roles'
import { hasPermission, type ResourceKey } from '#/lib/authz'
import type { SurfaceFlag, SurfaceFlagMap } from '#/lib/flags'

export type NavItemStatus = 'live' | 'shell'

export interface NavItem {
  key: string
  label: string
  path: string
  icon: Icon
  /** Canonical permission from roles.v1.yaml. Preferred for new surfaces. */
  permission?: Permission
  /**
   * Admin surfaces need `platform.admin_access` in addition to the domain
   * permission: `*.read` is granted to every reader because it gates public
   * content, so it cannot by itself mean "show this in the dashboard".
   */
  requiresAdmin?: boolean
  /** Legacy RBAC resource for screens that predate the contract. */
  resource?: ResourceKey
  /** New surfaces ship behind a flag; legacy items have no flag. */
  flag?: SurfaceFlag
  /** `shell` renders the placeholder route until the owning stream lands. */
  status: NavItemStatus
  /** Owning stream/ticket, shown on the shell placeholder. */
  owner?: string
}

export interface NavSection {
  key: string
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    key: 'discovery',
    label: 'Discovery',
    items: [
      { key: 'analytics', label: 'Analytics', path: '/analytics', icon: ChartBar, permission: 'analytics.read', requiresAdmin: true, flag: 'analytics', status: 'live', owner: 'stream:analytics' },
      { key: 'cms', label: 'CMS', path: '/destinations', icon: MapTrifold, resource: 'destinations', status: 'live' },
      { key: 'then-now', label: 'Then & Now', path: '/then-now', icon: FilmSlate, resource: 'thenNow', status: 'live' },
      { key: 'media', label: 'Media Library', path: '/media', icon: ImageIcon, resource: 'media', status: 'live' },
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement',
    items: [
      { key: 'lms', label: 'LMS', path: '/lms', icon: BookOpen, resource: 'lms', status: 'live' },
      { key: 'conservation', label: 'Conservation', path: '/conservation', icon: Leaf, resource: 'conservation', status: 'live' },
      { key: 'events', label: 'Events', path: '/events', icon: Calendar, resource: 'events', status: 'live' },
      { key: 'marketplace', label: 'Marketplace', path: '/marketplace', icon: Storefront, resource: 'marketplace', status: 'live' },
    ],
  },
  {
    key: 'programme',
    label: 'Programme',
    items: [
      {
        key: 'mice',
        label: 'Events operations',
        path: '/programme/events',
        icon: Calendar,
        permission: 'events.read',
        requiresAdmin: true,
        flag: 'mice',
        status: 'live',
        owner: 'stream:mice',
      },
      {
        key: 'recognition',
        label: 'Recognition',
        path: '/recognition',
        icon: Sparkle,
        permission: 'recognition.read',
        requiresAdmin: true,
        flag: 'recognition',
        status: 'live',
        owner: 'stream:recognition',
      },
      {
        key: 'species',
        label: 'Species',
        path: '/programme/species',
        icon: Leaf,
        permission: 'species.read',
        requiresAdmin: true,
        flag: 'species',
        status: 'shell',
        owner: 'stream:species',
      },
    ],
  },
  {
    key: 'platform',
    label: 'Platform',
    items: [
      { key: 'challenges', label: 'Challenges', path: '/challenges', icon: Trophy, resource: 'challenges', status: 'live' },
      { key: 'comments', label: 'Comments', path: '/comments', icon: ChatDots, resource: 'comments', status: 'live' },
      { key: 'campaigns', label: 'Campaigns', path: '/campaigns', icon: Megaphone, resource: 'campaigns', status: 'live' },
      { key: 'users', label: 'User Management', path: '/users', icon: Users, resource: 'user', status: 'live' },
      { key: 'ai-config', label: 'AI Config', path: '/ai-config', icon: Robot, resource: 'aiConfig', status: 'live' },
    ],
  },
]

export const PINNED_ITEMS: readonly NavItem[] = [
  { key: 'settings', label: 'Settings', path: '/settings', icon: GearSix, status: 'live' },
]

export interface NavVisibilityInput {
  role: Role
  flags: SurfaceFlagMap
}

/** The one visibility rule for the sidebar and for route guards. */
export function isItemVisible(item: NavItem, { role, flags }: NavVisibilityInput): boolean {
  if (item.flag && !flags[item.flag]) return false
  if (item.requiresAdmin && !canAccessAdmin(role)) return false
  if (item.permission && !roleHasPermission(role, item.permission)) return false
  if (item.resource && !hasPermission(role, item.resource, ['read'])) return false
  return true
}

export function visibleSections(input: NavVisibilityInput): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isItemVisible(item, input)),
  })).filter((section) => section.items.length > 0)
}

export function findNavItem(path: string): NavItem | undefined {
  const items = [...NAV_SECTIONS.flatMap((section) => section.items), ...PINNED_ITEMS]
  return items.find((item) => item.path === path)
}

/** Program surfaces for the placeholder page, independent of the sidebar. */
export const SHELL_SURFACES = NAV_SECTIONS.flatMap((section) =>
  section.items.filter((item) => item.status === 'shell'),
)

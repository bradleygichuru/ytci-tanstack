// Controlled destination taxonomy. Keep in sync with the mobile
// STOP_CATEGORIES and ytci-go internal/catalog/taxonomy.go.
export const DESTINATION_CATEGORIES = [
  'Activity',
  'Wildlife',
  'Hiking',
  'Photography',
  'Beach',
  'Culture',
  'Food',
  'Sightseeing',
  'Shopping',
  'Transport',
  'Rest',
  'Conservation',
] as const

export type DestinationCategory = (typeof DESTINATION_CATEGORIES)[number]

export const DESTINATION_CATEGORY_SET: ReadonlySet<string> = new Set(DESTINATION_CATEGORIES)

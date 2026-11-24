/**
 * The fixture/data-state switchers exist so verification can exercise empty,
 * loading, error and stale renders without breaking the API. They are a
 * development affordance: in a production build they let anyone put a surface
 * into an error state and report the product as broken, so they are hidden
 * unless an explicit build flag opts in.
 */
export function dataStatesAllowed(): boolean {
  if (import.meta.env.DEV) return true
  return import.meta.env.VITE_ALLOW_DATA_STATES === 'true'
}

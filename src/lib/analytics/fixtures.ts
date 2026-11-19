/**
 * Illustrative rows for the two screens the frozen analytics 1.0.0 contract
 * does not expose. These are never presented as live numbers: the screen badge
 * and the footer both say "Sample overlay", and the scope line says the data is
 * not filter-aware.
 *
 * Nothing here is used to fill a contract-backed KPI. If a contract read fails
 * the screen shows the failed-rollup state; it never substitutes a sample.
 */
import type { ContentRow, SuppressedDemoRow } from './types'

/** The prototype's content rows, kept only as a labelled overlay. */
export const SAMPLE_CONTENT_ROWS: ContentRow[] = [
  { surface: 'Maasai Mara · view → save → plan', started: 3240, completed: 412, completionRate: 0.127, source: 'overlay' },
  { surface: 'Diani · view → save → plan', started: 2860, completed: 301, completionRate: 0.105, source: 'overlay' },
  { surface: 'Amboseli · view → save → plan', started: 2140, completed: 240, completionRate: 0.112, source: 'overlay' },
  { surface: 'Wildlife Conservation in Kenya · start → complete', started: 720, completed: 346, completionRate: 0.481, source: 'overlay' },
  { surface: 'Community Tourism · start → complete', started: 620, completed: 301, completionRate: 0.485, source: 'overlay' },
  { surface: 'Audio Storytelling · start → complete', started: 410, completed: 188, completionRate: 0.459, source: 'overlay' },
]

/**
 * County × feature demo for the suppression screen. Values deliberately include
 * suppressed counties so the "no total" rule is visible. The contract's real
 * suppressed cells are listed above this table.
 */
export const SUPPRESSION_DEMO_ROWS: SuppressedDemoRow[] = [
  { county: 'Nairobi', events: 1240, recognition: 860, learning: 710 },
  { county: 'Narok', events: 310, recognition: 180, learning: 120 },
  { county: 'Lamu', events: null, recognition: null, learning: null },
  { county: 'Turkana', events: null, recognition: null, learning: null },
]

/** Contract-gap copy shared by the search and programme screens. */
export const CONTRACT_GAP_NOTE =
  'Not exposed by analytics contract 1.0.0. No contract change was made for this ticket; the screen names the gap instead of inventing a number.'

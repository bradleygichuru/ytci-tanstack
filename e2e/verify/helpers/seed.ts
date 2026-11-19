/**
 * Seed and target contract for Playwright verification.
 *
 * Safety rule: a live run owns its server and its seed. It never points at the
 * admin dev server on :3000, at Metro ports, or at another session's database.
 * Fixture mode needs none of this.
 */

export type VerifyMode = 'fixture' | 'live'

export interface VerifyTarget {
  mode: VerifyMode
  baseURL: string
  seedId?: string
  resetURL?: string
}

const FIXTURE_URL = 'http://127.0.0.1:3210'
const DEFAULT_VERIFY_PORT = '3210'
const FORBIDDEN_PORTS = new Set(['3000', '8081', '8082'])

export function readVerifyTarget(env: NodeJS.ProcessEnv = process.env): VerifyTarget {
  const mode = (env.VERIFY_MODE ?? 'fixture') as VerifyMode
  if (mode !== 'fixture' && mode !== 'live') {
    throw new Error(`VERIFY_MODE must be "fixture" or "live"; got "${env.VERIFY_MODE}"`)
  }

  return {
    mode,
    baseURL: env.VERIFY_BASE_URL ?? FIXTURE_URL,
    seedId: env.VERIFY_SEED_ID,
    resetURL: env.VERIFY_RESET_URL,
  }
}

/**
 * Throws unless the run is isolated. Returns the validated target so callers
 * can use the resolved base URL / seed id.
 */
export function assertDisposableTarget(
  target: VerifyTarget = readVerifyTarget(),
  env: NodeJS.ProcessEnv = process.env,
): VerifyTarget {
  if (target.mode === 'fixture') {
    if (target.baseURL !== FIXTURE_URL) {
      throw new Error(
        `Fixture mode must use ${FIXTURE_URL}; got ${target.baseURL}. Set VERIFY_MODE=live for an external app.`,
      )
    }
    return target
  }

  if (!target.seedId) {
    throw new Error(
      'Live verification requires VERIFY_SEED_ID (for example verify-local-<session>). Refusing to use a shared seed.',
    )
  }
  if (!/^verify[-_]/i.test(target.seedId)) {
    throw new Error(
      `VERIFY_SEED_ID must start with "verify-" or "verify_"; got "${target.seedId}".`,
    )
  }

  let url: URL
  try {
    url = new URL(target.baseURL)
  } catch {
    throw new Error(`VERIFY_BASE_URL is not a valid URL: "${target.baseURL}"`)
  }

  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error(
      `Live verification is local-only; got host "${url.hostname}". Do not point at a shared deployment.`,
    )
  }
  if (FORBIDDEN_PORTS.has(url.port)) {
    throw new Error(
      `Port ${url.port} belongs to a dev/Metro session. Use a unique verify port, default ${DEFAULT_VERIFY_PORT}.`,
    )
  }
  if (url.port !== DEFAULT_VERIFY_PORT && env.VERIFY_ALLOW_PORT !== '1') {
    throw new Error(
      `Live verification defaults to port ${DEFAULT_VERIFY_PORT}; got ${url.port}. ` +
        'Set VERIFY_ALLOW_PORT=1 only when you have confirmed the port is yours.',
    )
  }

  const databaseURL = env.DATABASE_URL
  if (databaseURL && !/verify/i.test(databaseURL)) {
    throw new Error(
      'DATABASE_URL does not look disposable (it must contain "verify"). Refusing to run against a shared database.',
    )
  }

  return target
}

/** Deterministic fixture identifiers. Keep these stable across specs. */
export const VERIFY_FIXTURES = {
  users: {
    superAdmin: { email: 'verify-admin@example.test', role: 'super_admin' },
    moderator: { email: 'verify-moderator@example.test', role: 'moderator' },
    organiser: { email: 'verify-organiser@example.test', role: 'organiser' },
    staffScanner: { email: 'verify-scanner@example.test', role: 'staff' },
  },
  events: {
    eventId: 'verify-event-001',
    eventTitle: 'Verification Game Drive',
    venueId: 'verify-venue-001',
    registrationId: 'verify-registration-001',
    ticketCode: 'VFY-0001',
  },
  recognition: {
    seasonId: 'verify-season-001',
    badgeId: 'verify-badge-001',
    missionId: 'verify-mission-001',
    ruleVersionId: 'verify-rule-v1',
  },
  species: {
    speciesId: 'verify-species-001',
    scientificName: 'Verificatia testensis',
    languageVariantId: 'verify-variant-sw-001',
    sourceId: 'verify-source-001',
  },
  analytics: {
    from: '2026-01-01',
    to: '2026-01-31',
    consentVersion: 'verify-consent-v1',
  },
} as const

/**
 * Optional reset hook. The harness never opens the database; a track-specific
 * seed script or endpoint owns the data and is called only when configured.
 */
export async function resetVerifySeed(
  target: VerifyTarget = assertDisposableTarget(),
): Promise<void> {
  if (target.mode !== 'live') return
  if (!target.resetURL) return

  const response = await fetch(target.resetURL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.VERIFY_RESET_TOKEN
        ? { authorization: `Bearer ${process.env.VERIFY_RESET_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ seedId: target.seedId }),
  })

  if (!response.ok) {
    throw new Error(`Seed reset failed: ${response.status} ${response.statusText}`)
  }
}

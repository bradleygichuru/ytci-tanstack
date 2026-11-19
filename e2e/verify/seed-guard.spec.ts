import { test, expect } from '@playwright/test'
import { assertDisposableTarget, readVerifyTarget } from './helpers/seed'

/**
 * These tests guard the coordination rule: a verification run must own its
 * server and its seed. They use plain environment objects and never start the
 * admin app, so they run in fixture mode on port 3210.
 */
const liveEnv = {
  VERIFY_MODE: 'live',
  VERIFY_BASE_URL: 'http://127.0.0.1:3210',
  VERIFY_SEED_ID: 'verify-local-test',
} satisfies NodeJS.ProcessEnv

test.describe('disposable target guard', () => {
  test('fixture mode defaults to the owned fixture port', () => {
    const env: NodeJS.ProcessEnv = {}
    expect(readVerifyTarget(env).mode).toBe('fixture')
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).not.toThrow()
  })

  test('fixture mode refuses an external base URL', () => {
    const env: NodeJS.ProcessEnv = { VERIFY_BASE_URL: 'http://127.0.0.1:3000' }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).toThrow(
      /Fixture mode must use/,
    )
  })

  test('live mode requires a seed id', () => {
    const env: NodeJS.ProcessEnv = { ...liveEnv, VERIFY_SEED_ID: undefined }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).toThrow(
      /requires VERIFY_SEED_ID/,
    )
  })

  test('live mode refuses a non-disposable seed id', () => {
    const env: NodeJS.ProcessEnv = { ...liveEnv, VERIFY_SEED_ID: 'shared-main' }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).toThrow(
      /must start with "verify-"/,
    )
  })

  test('live mode refuses the admin dev server port', () => {
    const env: NodeJS.ProcessEnv = {
      ...liveEnv,
      VERIFY_BASE_URL: 'http://127.0.0.1:3000',
    }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).toThrow(
      /belongs to a dev\/Metro session/,
    )
  })

  test('live mode refuses a non-local deployment', () => {
    const env: NodeJS.ProcessEnv = {
      ...liveEnv,
      VERIFY_BASE_URL: 'https://ytci-tanstack.vercel.app',
    }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).toThrow(/local-only/)
  })

  test('live mode refuses a shared database URL', () => {
    const env: NodeJS.ProcessEnv = {
      ...liveEnv,
      DATABASE_URL: 'postgres://ytci:secret@localhost:5432/ytci',
    }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).toThrow(
      /must contain "verify"/,
    )
  })

  test('live mode accepts an owned port and disposable seed', () => {
    const env: NodeJS.ProcessEnv = {
      ...liveEnv,
      DATABASE_URL: 'postgres://ytci:secret@localhost:5432/ytci_verify_377',
    }
    expect(() => assertDisposableTarget(readVerifyTarget(env), env)).not.toThrow()
  })
})

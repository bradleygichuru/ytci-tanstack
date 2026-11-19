/**
 * Vitest global setup: build and run the frozen contracts mock server.
 *
 * YTCI_GO_DIR defaults to `../ytci-go` next to this repo. The binary is built
 * rather than `go run`-ed so teardown kills exactly one process.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ADDR = process.env.CONTRACTS_MOCK_ADDR || ':8099'
const PORT = ADDR.replace(/^:/, '')

export default async function setup() {
  const repo = resolve(__dirname, '..', '..')
  const goDir = resolve(process.env.YTCI_GO_DIR || join(repo, '..', 'ytci-go'))

  if (!existsSync(join(goDir, 'cmd', 'contracts-mock'))) {
    throw new Error(
      `contracts-mock not found in ${goDir}. Set YTCI_GO_DIR to the ytci-go checkout that contains cmd/contracts-mock.`,
    )
  }

  const workDir = mkdtempSync(join(tmpdir(), 'contracts-mock-'))
  const binary = join(workDir, 'contracts-mock')

  execFileSync('go', ['build', '-o', binary, './cmd/contracts-mock'], {
    cwd: goDir,
    stdio: 'inherit',
  })

  const child = spawn(binary, ['-addr', ADDR], { stdio: 'ignore', detached: true })
  child.unref()

  const pid = child.pid
  if (!pid) throw new Error('contracts-mock failed to start')

  const baseUrl = `http://127.0.0.1:${PORT}`
  process.env.CONTRACTS_MOCK_URL = baseUrl
  writeFileSync(join(workDir, 'pid'), String(pid))

  const deadline = Date.now() + 30_000
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) {
        const body = (await response.json()) as { ok?: boolean }
        if (body.ok) {
          process.stdout.write(`contracts-mock ready at ${baseUrl}\n`)
          return () => {
            try {
              process.kill(-pid, 'SIGTERM')
            } catch {
              /* already exited */
            }
          }
        }
      }
    } catch (error) {
      lastError = error
    }
    await new Promise((r) => setTimeout(r, 250))
  }

  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    /* already gone */
  }
  throw new Error(`contracts-mock did not become healthy: ${String(lastError ?? 'timeout')}`)
}

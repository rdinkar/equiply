import { createSeedData } from '@/mocks/seed'
import type { WorkspaceData } from '@/types/domain'

/**
 * In-memory stand-in for a backend. It holds the workspace "database", adds
 * latency so loading states are real, and can fail on demand so error states
 * can be shown. Services are the only callers; components never touch it.
 */

type FailMode = 'load' | 'mutation' | null

interface MockServerConfig {
  /** Fixed delay, or a [min, max] range with deterministic jitter. */
  latencyMs: number | [number, number]
  /** Fail the next request of this kind once, then go back to normal. */
  failNext: FailMode
}

export class NetworkError extends Error {
  constructor(message = 'We couldn’t reach the Equiply server. Check your connection and try again.') {
    super(message)
    this.name = 'NetworkError'
  }
}

let db: WorkspaceData = createSeedData()
let config: MockServerConfig = { latencyMs: [350, 700], failNext: null }
let requestCount = 0

function delay(): Promise<void> {
  const [min, max] = typeof config.latencyMs === 'number' ? [config.latencyMs, config.latencyMs] : config.latencyMs
  if (max <= 0) return Promise.resolve()
  const ms = min + ((requestCount++ * 137) % (max - min + 1))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldFail(kind: Exclude<FailMode, null>): boolean {
  if (config.failNext !== kind) return false
  config = { ...config, failNext: null }
  return true
}

export const mockServer = {
  configure(partial: Partial<MockServerConfig>) {
    config = { ...config, ...partial }
  },

  /** Re-seed the database (tests, or a "reset demo data" control). */
  reset(today: Date = new Date()) {
    db = createSeedData(today)
  },

  /** Synchronous read for tests only. */
  peek(): WorkspaceData {
    return db
  },

  async read(): Promise<WorkspaceData> {
    await delay()
    if (shouldFail('load')) throw new NetworkError()
    return db
  },

  /**
   * Apply a write. `op` runs a pure domain operation against the current data
   * and returns the next data plus a result. Domain errors propagate unchanged
   * and leave the database untouched.
   */
  async write<T>(op: (data: WorkspaceData) => { data: WorkspaceData; result: T }): Promise<{ data: WorkspaceData; result: T }> {
    await delay()
    if (shouldFail('mutation')) throw new NetworkError()
    const outcome = op(db)
    db = outcome.data
    return outcome
  },
}

/** Demo switches: `?simulate=load-error` or `?simulate=mutation-error`. */
export function applySimulationFlags(search: string) {
  const mode = new URLSearchParams(search).get('simulate')
  if (mode === 'load-error') mockServer.configure({ failNext: 'load' })
  if (mode === 'mutation-error') mockServer.configure({ failNext: 'mutation' })
}

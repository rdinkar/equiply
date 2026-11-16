import type { WorkspaceData } from '@/types/domain'
import { mockServer } from './mockServer'

let inflight: Promise<WorkspaceData> | null = null

export const workspaceService = {
  /**
   * Load everything the workspace shows. Concurrent callers share one request
   * (React StrictMode mounts effects twice in development), the way a query
   * cache would dedupe them.
   */
  fetchWorkspace(): Promise<WorkspaceData> {
    inflight ??= mockServer.read().finally(() => {
      inflight = null
    })
    return inflight
  },
}

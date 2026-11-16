import { createDomainContext, type DomainContext } from '@/domain/context'
import type { WorkspaceData } from '@/types/domain'
import { mockServer } from './mockServer'

/** One simulated write: run a domain operation on the server's data and respond with the result. */
export function runMutation(op: (data: WorkspaceData, ctx: DomainContext) => WorkspaceData): Promise<WorkspaceData> {
  return mockServer.write((data) => ({ data: op(data, createDomainContext()), result: undefined })).then((r) => r.data)
}

/** Like runMutation, for operations that also return the entity they created. */
export function runCreate<T>(
  op: (data: WorkspaceData, ctx: DomainContext) => { data: WorkspaceData; created: T },
): Promise<{ data: WorkspaceData; created: T }> {
  return mockServer
    .write((data) => {
      const out = op(data, createDomainContext())
      return { data: out.data, result: out.created }
    })
    .then((r) => ({ data: r.data, created: r.result }))
}

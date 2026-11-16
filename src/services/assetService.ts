import {
  assignAsset,
  createAsset,
  markAvailable,
  markUnderRepair,
  retireAsset,
  returnAsset,
  updateAsset,
} from '@/domain/assets'
import { createDomainContext, type DomainContext } from '@/domain/context'
import type { Asset, AssetCondition, AssetInput, WorkspaceData } from '@/types/domain'
import { mockServer } from './mockServer'

/**
 * Asset API surface. Each call is one simulated request. The mock server runs
 * the domain operation and responds with the updated workspace, like a sync
 * endpoint. Against a real backend, each method would become a fetch.
 */
function mutate(op: (data: WorkspaceData, ctx: DomainContext) => WorkspaceData): Promise<WorkspaceData> {
  return mockServer.write((data) => ({ data: op(data, createDomainContext()), result: undefined })).then((r) => r.data)
}

export const assetService = {
  async create(input: AssetInput): Promise<{ data: WorkspaceData; asset: Asset }> {
    const { data, result } = await mockServer.write((current) => {
      const out = createAsset(current, input, createDomainContext())
      return { data: out.data, result: out.asset }
    })
    return { data, asset: result }
  },
  update: (assetId: string, changes: AssetInput) => mutate((d, ctx) => updateAsset(d, { assetId, changes }, ctx)),
  assign: (assetId: string, employeeId: string) => mutate((d, ctx) => assignAsset(d, { assetId, employeeId }, ctx)),
  return: (assetId: string, condition: AssetCondition) => mutate((d, ctx) => returnAsset(d, { assetId, condition }, ctx)),
  markUnderRepair: (assetId: string, note?: string) => mutate((d, ctx) => markUnderRepair(d, { assetId, note }, ctx)),
  markAvailable: (assetId: string, condition: AssetCondition) =>
    mutate((d, ctx) => markAvailable(d, { assetId, condition }, ctx)),
  retire: (assetId: string, reason?: string) => mutate((d, ctx) => retireAsset(d, { assetId, reason }, ctx)),
}

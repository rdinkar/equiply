import { createContext } from 'react'
import type { Asset, AssetCondition, AssetInput, WorkspaceData } from '@/types/domain'

/**
 * Client-side cache of the workspace. `status` is a discriminated union, so
 * `data` is only non-null once loaded and components can't read half-loaded state.
 */
export type WorkspaceState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: WorkspaceData; error: null }
  | { status: 'error'; data: null; error: Error }

export type WorkspaceAction =
  | { type: 'load' }
  | { type: 'loaded'; data: WorkspaceData }
  | { type: 'failed'; error: Error }
  | { type: 'replace'; data: WorkspaceData }

export const initialWorkspaceState: WorkspaceState = { status: 'loading', data: null, error: null }

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'load':
      return initialWorkspaceState
    case 'loaded':
    case 'replace':
      return { status: 'ready', data: action.data, error: null }
    case 'failed':
      return { status: 'error', data: null, error: action.error }
    default:
      return state
  }
}

export type WorkspaceContextValue = WorkspaceState & { reload: () => void }

/** Mutations. Each resolves once the server confirms and the cache is updated. */
export interface WorkspaceActions {
  createAsset: (input: AssetInput) => Promise<Asset>
  updateAsset: (assetId: string, changes: AssetInput) => Promise<void>
  assignAsset: (assetId: string, employeeId: string) => Promise<void>
  returnAsset: (assetId: string, condition: AssetCondition) => Promise<void>
  markUnderRepair: (assetId: string, note?: string) => Promise<void>
  markAvailable: (assetId: string, condition: AssetCondition) => Promise<void>
  retireAsset: (assetId: string, reason?: string) => Promise<void>
}

export const WorkspaceStateContext = createContext<WorkspaceContextValue | null>(null)
/**
 * Separate from the state context: the actions object never changes, so
 * components that only trigger mutations don't re-render when data changes.
 */
export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null)

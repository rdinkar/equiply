import { use } from 'react'
import type { WorkspaceData } from '@/types/domain'
import {
  WorkspaceActionsContext,
  WorkspaceStateContext,
  type WorkspaceActions,
  type WorkspaceContextValue,
} from './workspaceContext'

export function useWorkspace(): WorkspaceContextValue {
  const value = use(WorkspaceStateContext)
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return value
}

/** Loaded data. Only call under a gate that renders children once status is 'ready'. */
export function useWorkspaceData(): WorkspaceData {
  const { status, data } = useWorkspace()
  if (status !== 'ready') throw new Error('useWorkspaceData called before the workspace loaded')
  return data
}

export function useWorkspaceActions(): WorkspaceActions {
  const value = use(WorkspaceActionsContext)
  if (!value) throw new Error('useWorkspaceActions must be used inside <WorkspaceProvider>')
  return value
}

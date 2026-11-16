import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { assetService } from '@/services/assetService'
import { offboardingService } from '@/services/offboardingService'
import { onboardingService } from '@/services/onboardingService'
import { workspaceService } from '@/services/workspaceService'
import type { WorkspaceData } from '@/types/domain'
import {
  WorkspaceActionsContext,
  WorkspaceStateContext,
  initialWorkspaceState,
  workspaceReducer,
  type WorkspaceActions,
} from './workspaceContext'

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState)
  const [loadToken, setLoadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    workspaceService.fetchWorkspace().then(
      (data) => !cancelled && dispatch({ type: 'loaded', data }),
      (error: unknown) => !cancelled && dispatch({ type: 'failed', error: toError(error) }),
    )
    return () => {
      cancelled = true
    }
  }, [loadToken])

  const reload = useCallback(() => {
    dispatch({ type: 'load' })
    setLoadToken((n) => n + 1)
  }, [])

  const actions = useMemo<WorkspaceActions>(() => {
    const commit = (data: WorkspaceData) => dispatch({ type: 'replace', data })
    return {
      createAsset: async (input) => {
        const { data, asset } = await assetService.create(input)
        commit(data)
        return asset
      },
      updateAsset: async (assetId, changes) => commit(await assetService.update(assetId, changes)),
      assignAsset: async (assetId, employeeId) => commit(await assetService.assign(assetId, employeeId)),
      returnAsset: async (assetId, condition) => commit(await assetService.return(assetId, condition)),
      markUnderRepair: async (assetId, note) => commit(await assetService.markUnderRepair(assetId, note)),
      markAvailable: async (assetId, condition) => commit(await assetService.markAvailable(assetId, condition)),
      retireAsset: async (assetId, reason) => commit(await assetService.retire(assetId, reason)),
      addNewHire: async (input) => {
        const { data, employee } = await onboardingService.addHire(input)
        commit(data)
        return employee
      },
      completeOnboarding: async (employeeId) => commit(await onboardingService.complete(employeeId)),
      initiateOffboarding: async (employeeId, lastWorkingDay) => commit(await offboardingService.initiate(employeeId, lastWorkingDay)),
      completeOffboarding: async (employeeId) => commit(await offboardingService.complete(employeeId)),
    }
  }, [])

  const value = useMemo(() => ({ ...state, reload }), [state, reload])

  return (
    <WorkspaceStateContext value={value}>
      <WorkspaceActionsContext value={actions}>{children}</WorkspaceActionsContext>
    </WorkspaceStateContext>
  )
}

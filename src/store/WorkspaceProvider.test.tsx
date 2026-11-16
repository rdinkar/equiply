import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockServer } from '@/services/mockServer'
import { useMutation } from './useMutation'
import { useWorkspace, useWorkspaceActions, useWorkspaceData } from './useWorkspace'
import { WorkspaceProvider } from './WorkspaceProvider'

function Status() {
  const { status, error, reload } = useWorkspace()
  if (status === 'loading') return <p>loading</p>
  if (status === 'error')
    return (
      <div>
        <p>error: {error?.message}</p>
        <button onClick={reload}>Retry</button>
      </div>
    )
  return <ReadyView />
}

function ReadyView() {
  const data = useWorkspaceData()
  return <p>ready: {data.assets.length} assets</p>
}

function AssetStatus({ assetId }: { assetId: string }) {
  const data = useWorkspaceData()
  return <p>status: {data.assets.find((a) => a.id === assetId)?.status}</p>
}

function AssignedCount() {
  const data = useWorkspaceData()
  return <p>assigned: {data.assets.filter((a) => a.status === 'Assigned').length}</p>
}

function AssignButton({ assetId, employeeId }: { assetId: string; employeeId: string }) {
  const { assignAsset } = useWorkspaceActions()
  const { mutate, isPending, error } = useMutation(assignAsset)
  return (
    <>
      <button disabled={isPending} onClick={() => void mutate(assetId, employeeId)}>
        Assign
      </button>
      {error && <p role="alert">{error.message}</p>}
    </>
  )
}

function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useWorkspace()
  return status === 'ready' ? children : <p>waiting</p>
}

describe('WorkspaceProvider', () => {
  beforeEach(() => {
    mockServer.reset(new Date(2026, 10, 16, 9))
    mockServer.configure({ latencyMs: 0, failNext: null })
  })

  it('shows loading, then the loaded workspace', async () => {
    render(
      <WorkspaceProvider>
        <Status />
      </WorkspaceProvider>,
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('ready: 53 assets')).toBeInTheDocument()
  })

  it('shows an error when loading fails and recovers on retry', async () => {
    mockServer.configure({ failNext: 'load' })
    render(
      <WorkspaceProvider>
        <Status />
      </WorkspaceProvider>,
    )
    expect(await screen.findByText(/error: .*couldn’t reach/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('ready: 53 assets')).toBeInTheDocument()
  })

  it('a successful mutation updates every consumer', async () => {
    const available = mockServer.peek().assets.find((a) => a.status === 'Available')!
    const before = mockServer.peek().assets.filter((a) => a.status === 'Assigned').length
    render(
      <WorkspaceProvider>
        <Gate>
          <AssetStatus assetId={available.id} />
          <AssignedCount />
          <AssignButton assetId={available.id} employeeId="emp_priya" />
        </Gate>
      </WorkspaceProvider>,
    )
    expect(await screen.findByText('status: Available')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))

    expect(await screen.findByText('status: Assigned')).toBeInTheDocument()
    expect(screen.getByText(`assigned: ${before + 1}`)).toBeInTheDocument()
  })

  it('surfaces domain errors from a mutation without changing state', async () => {
    const repair = mockServer.peek().assets.find((a) => a.status === 'Under Repair')!
    render(
      <WorkspaceProvider>
        <Gate>
          <AssetStatus assetId={repair.id} />
          <AssignButton assetId={repair.id} employeeId="emp_priya" />
        </Gate>
      </WorkspaceProvider>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Assign' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/can’t be assigned/)
    expect(screen.getByText('status: Under Repair')).toBeInTheDocument()
  })
})

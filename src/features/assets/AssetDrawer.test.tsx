import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockServer } from '@/services/mockServer'
import { renderApp } from '@/test/renderApp'

const byTag = (tag: string) => mockServer.peek().assets.find((a) => a.assetTag === tag)!

describe('Asset drawer', () => {
  it('shows a not-found state for an unknown asset id', async () => {
    renderApp('/assets?asset=nope')
    const drawer = await screen.findByRole('dialog', { name: 'Asset not found' })
    expect(within(drawer).getByText(/doesn’t exist/)).toBeInTheDocument()
  })

  it('offers only the actions the asset’s lifecycle allows', async () => {
    renderApp(`/assets?asset=${byTag('EQ-LAP-0013').id}`) // Under Repair
    const drawer = within(await screen.findByRole('dialog', { name: /MacBook Pro 16" M1 Max/ }))

    expect(drawer.getByRole('button', { name: 'Mark available' })).toBeInTheDocument()
    expect(drawer.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument()
    expect(drawer.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument()
  })

  it('assigns an available asset and keeps the drawer in sync', async () => {
    const asset = byTag('EQ-LAP-0011')
    const { user } = renderApp(`/assets?asset=${asset.id}`)
    const drawer = within(await screen.findByRole('dialog', { name: new RegExp(asset.name) }))

    await user.click(drawer.getByRole('button', { name: 'Assign' }))
    const assign = within(await screen.findByRole('dialog', { name: 'Assign asset' }))
    await user.selectOptions(assign.getByLabelText('Employee'), 'emp_mei')
    await user.click(assign.getByRole('button', { name: 'Assign' }))

    const holder = await drawer.findByRole('region', { name: 'Assigned to' })
    expect(within(holder).getByRole('link', { name: 'Mei Tanaka' })).toHaveAttribute('href', '/employees/emp_mei')
    expect(drawer.getByRole('button', { name: 'Return' })).toBeInTheDocument()
    expect(mockServer.peek().assets.find((a) => a.id === asset.id)?.status).toBe('Assigned')
  })

  it('returns a damaged asset to repair', async () => {
    const asset = byTag('EQ-LAP-0001') // Priya's laptop
    const { user } = renderApp(`/assets?asset=${asset.id}`)
    const drawer = within(await screen.findByRole('dialog', { name: new RegExp(asset.name) }))

    await user.click(drawer.getByRole('button', { name: 'Return' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Record return' }))
    await user.click(dialog.getByRole('radio', { name: /Damaged/ }))
    await user.click(dialog.getByRole('button', { name: 'Record return' }))

    expect(await drawer.findByText('Under Repair')).toBeInTheDocument()
    expect(drawer.getByRole('button', { name: 'Mark available' })).toBeInTheDocument()
  })

  it('shows the success toast inside the drawer so it is not covered by it', async () => {
    const asset = byTag('EQ-LAP-0011') // Available
    const { user } = renderApp(`/assets?asset=${asset.id}`)
    const drawer = await screen.findByRole('dialog', { name: new RegExp(asset.name) })

    await user.click(within(drawer).getByRole('button', { name: 'Mark under repair' }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Send to repair?' }))
    await user.click(confirm.getByRole('button', { name: 'Mark under repair' }))

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent(/moved to repair/)
    expect(toast.closest('dialog')).toBe(drawer)
  })

  it('does not carry an open dialog over to the next asset after Back', async () => {
    const first = byTag('EQ-LAP-0008')
    const second = byTag('EQ-LAP-0011')
    const { user, router } = renderApp('/assets')
    await screen.findByRole('table', { name: 'Asset inventory' })

    await act(() => router.navigate(`/assets?asset=${first.id}`))
    const drawer = within(await screen.findByRole('dialog', { name: new RegExp(first.name) }))
    await user.click(drawer.getByRole('button', { name: 'Retire' }))
    expect(await screen.findByRole('dialog', { name: 'Retire this asset?' })).toBeInTheDocument()

    await act(() => router.navigate(-1))
    await act(() => router.navigate(`/assets?asset=${second.id}`))

    expect(await screen.findByRole('dialog', { name: new RegExp(second.name) })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Retire this asset?' })).not.toBeInTheDocument()
  })

  it('does not offer Retire while the asset is pending return from a leaver', async () => {
    const jamesLaptop = byTag('EQ-LAP-0006')
    renderApp(`/assets?asset=${jamesLaptop.id}`)
    const drawer = within(await screen.findByRole('dialog', { name: new RegExp(jamesLaptop.name) }))

    expect(drawer.queryByRole('button', { name: 'Retire' })).not.toBeInTheDocument()
    expect(drawer.getByText(/pending return from James Wilson/)).toBeInTheDocument()
  })

  it('closes Edit without a write or a toast when nothing changed', async () => {
    const asset = byTag('EQ-LAP-0011')
    const activitiesBefore = mockServer.peek().activities.length
    const { user } = renderApp(`/assets?asset=${asset.id}`)
    const drawer = within(await screen.findByRole('dialog', { name: new RegExp(asset.name) }))

    await user.click(drawer.getByRole('button', { name: 'Edit' }))
    const edit = await screen.findByRole('dialog', { name: 'Edit asset' })
    await user.click(within(edit).getByRole('button', { name: 'Save changes' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 20))) // let any write and toast land

    expect(screen.queryByRole('dialog', { name: 'Edit asset' })).not.toBeInTheDocument()

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(mockServer.peek().activities).toHaveLength(activitiesBefore)
  })
})

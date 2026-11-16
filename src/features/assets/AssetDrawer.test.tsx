import { screen, within } from '@testing-library/react'
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
})

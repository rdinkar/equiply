import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockServer } from '@/services/mockServer'
import { renderApp } from '@/test/renderApp'

async function openAddAsset() {
  const app = renderApp('/assets')
  await app.user.click(await screen.findByRole('button', { name: 'Add asset' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add asset' })
  return { ...app, dialog: within(dialog) }
}

describe('Add asset', () => {
  it('shows required-field errors and does not submit', async () => {
    const { user, dialog } = await openAddAsset()
    const before = mockServer.peek().assets.length

    await user.click(dialog.getByRole('button', { name: 'Add asset' }))

    expect(dialog.getByLabelText(/Asset name/)).toHaveAccessibleDescription('Enter an asset name.')
    expect(dialog.getByLabelText(/Serial number/)).toHaveAttribute('aria-invalid', 'true')
    expect(dialog.getByLabelText(/Asset name/)).toHaveFocus()
    expect(mockServer.peek().assets).toHaveLength(before)
  })

  it('flags a serial number that already belongs to another asset', async () => {
    const { user, dialog } = await openAddAsset()

    await user.type(dialog.getByLabelText(/Serial number/), 'c02fk1abq6l4')
    await user.click(dialog.getByRole('button', { name: 'Add asset' }))

    expect(dialog.getByLabelText(/Serial number/)).toHaveAccessibleDescription(
      'This serial number already belongs to EQ-LAP-0001.',
    )
  })

  it('adds the asset with a generated tag and shows it in the inventory', async () => {
    const { user, dialog } = await openAddAsset()

    await user.type(dialog.getByLabelText(/Asset name/), 'Studio Display')
    await user.selectOptions(dialog.getByLabelText(/Category/), 'Monitor')
    await user.type(dialog.getByLabelText(/Manufacturer/), 'Apple')
    await user.type(dialog.getByLabelText(/Model/), 'A2525')
    await user.type(dialog.getByLabelText(/Serial number/), 'SD-2026-0001')
    await user.type(dialog.getByLabelText(/Purchase cost/), '1599')
    await user.type(dialog.getByLabelText(/Warranty expiry/), '2029-11-16')
    await user.type(dialog.getByLabelText(/Location/), 'SF HQ · IT storage')
    await user.click(dialog.getByRole('button', { name: 'Add asset' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Studio Display added as EQ-MON-0054')
    // The new asset opens straight away instead of landing unseen on the last page.
    expect(await screen.findByRole('dialog', { name: 'Studio Display' })).toHaveAccessibleDescription(/EQ-MON-0054/)
    await user.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'Studio')
    const table = screen.getByRole('table', { name: 'Asset inventory' })
    expect(await within(table).findByRole('link', { name: 'Studio Display' })).toBeInTheDocument()
    // The tag renders twice (desktop column + mobile subline, one hidden by CSS at any width).
    expect(within(table).getAllByText('EQ-MON-0054').length).toBeGreaterThan(0)
  })
})

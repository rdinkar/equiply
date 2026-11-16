import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('Assets page', () => {
  it('shows manufacturer and model with each asset name, not in a column that hides on laptops', async () => {
    renderApp('/assets')
    const [link] = await screen.findAllByRole('link', { name: 'MacBook Pro 14" M3 Pro' })
    expect(link!.closest('td')).toHaveTextContent('Apple MacBook Pro 14 (M3 Pro, 2023)')
  })

  it('keeps the caret where the user is typing in search', async () => {
    const { user } = renderApp('/assets?q=macbook')
    const box = await screen.findByRole('searchbox', { name: 'Search assets' })
    await user.type(box, 'XY', { initialSelectionStart: 3, initialSelectionEnd: 3 })
    expect(box).toHaveValue('macXYbook')
  })

  it('clears the search box when filters are cleared', async () => {
    const { user } = renderApp('/assets?q=zzz')
    await user.click((await screen.findAllByRole('button', { name: 'Clear filters' }))[0]!)
    expect(screen.getByRole('searchbox', { name: 'Search assets' })).toHaveValue('')
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('Employee detail', () => {
  it('shows a not-found state for an unknown employee', async () => {
    renderApp('/employees/nope')
    expect(await screen.findByRole('heading', { name: 'Employee not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute('href', '/employees')
  })

  it('lists current hardware and moves a returned asset into history', async () => {
    const { user } = renderApp('/employees/emp_priya')
    const current = await screen.findByRole('region', { name: /Assigned hardware/ })
    const before = within(current).getAllByRole('listitem').length
    expect(before).toBe(4)

    await user.click(within(current).getByRole('button', { name: /Return MacBook Pro 14" M3 Pro/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Record return' }))
    await user.click(dialog.getByRole('button', { name: 'Record return' }))

    expect(await screen.findByRole('status')).toHaveTextContent('returned and back in stock')
    expect(within(current).getAllByRole('listitem')).toHaveLength(before - 1)
    const history = screen.getByRole('region', { name: 'Assignment history' })
    expect(within(history).getByText('MacBook Pro 14" M3 Pro')).toBeInTheDocument()
  })

  it('blocks new assignments for an employee being offboarded and summarises outstanding returns', async () => {
    renderApp('/employees/emp_james')
    expect(await screen.findByText(/2 assets still to recover/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign asset' })).toBeDisabled()
    expect(screen.getByText(/being offboarded/)).toBeInTheDocument()
  })
})

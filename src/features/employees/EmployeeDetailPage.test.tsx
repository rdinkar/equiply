import { act, fireEvent, screen, within } from '@testing-library/react'
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

  it('closes an open dialog when Back returns to a different employee', async () => {
    const { user, router } = renderApp('/employees/emp_priya')
    await screen.findByRole('heading', { name: /Priya Sharma/ })
    await act(() => router.navigate('/employees/emp_nikhil'))
    await user.click(await screen.findByRole('button', { name: 'Assign asset' }))
    expect(await screen.findByRole('dialog', { name: 'Assign asset' })).toHaveAccessibleDescription(/Nikhil Rao/)

    await act(() => router.navigate(-1))

    expect(await screen.findByRole('heading', { name: /Priya Sharma/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the caret where the user is typing in the directory search', async () => {
    const { user } = renderApp('/employees?q=priya')
    const box = await screen.findByRole('searchbox', { name: 'Search employees' })
    await user.type(box, 'XY', { initialSelectionStart: 2, initialSelectionEnd: 2 })
    expect(box).toHaveValue('prXYiya')
  })

  it('initiates offboarding for an active employee and lists what to recover', async () => {
    const { user } = renderApp('/employees/emp_priya')
    await user.click(await screen.findByRole('button', { name: 'Initiate offboarding' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Initiate offboarding' }))
    expect(within(dialog.getByRole('list', { name: 'Equipment to recover' })).getAllByRole('listitem')).toHaveLength(4)

    fireEvent.change(dialog.getByLabelText(/Last working day/), { target: { value: '2026-11-30' } })
    await user.click(dialog.getByRole('button', { name: 'Start offboarding' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Offboarding started for Priya Sharma')
    expect(await screen.findByText(/4 assets still to recover/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign asset' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Initiate offboarding' })).not.toBeInTheDocument()
  })

  it('only offers offboarding to active employees', async () => {
    renderApp('/employees/emp_james')
    await screen.findByText(/2 assets still to recover/)
    expect(screen.queryByRole('button', { name: 'Initiate offboarding' })).not.toBeInTheDocument()
  })

  it('shows the current headcount that the overview metric links to', async () => {
    renderApp('/employees')
    expect(await screen.findByText(/^20 current people/)).toBeInTheDocument()
  })

  it('explains why onboarding or offboarding cannot be completed yet', async () => {
    const { unmount } = renderApp('/employees/emp_mei')
    expect(await screen.findByRole('button', { name: 'Complete onboarding' })).toBeDisabled()
    expect(screen.getByText('Assign the required Laptop first.')).toBeInTheDocument()
    unmount()

    renderApp('/employees/emp_james')
    expect(await screen.findByRole('button', { name: 'Complete offboarding' })).toBeDisabled()
    expect(screen.getByText('2 assets are still pending return.')).toBeInTheDocument()
  })

  it('completes offboarding from the employee page once everything is back', async () => {
    const { user } = renderApp('/employees/emp_ryan')
    await user.click(await screen.findByRole('button', { name: 'Complete offboarding' }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Complete offboarding?' }))
    await user.click(confirm.getByRole('button', { name: 'Complete offboarding' }))
    expect(await screen.findByRole('heading', { name: /Ryan O’Connor\s*Inactive/ })).toBeInTheDocument()
  })
})

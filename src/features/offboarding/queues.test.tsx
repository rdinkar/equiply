import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockServer } from '@/services/mockServer'
import { renderApp } from '@/test/renderApp'

const card = async (name: RegExp) => (await screen.findByRole('link', { name })).closest('section')!
const statusOf = (id: string) => mockServer.peek().employees.find((e) => e.id === id)?.status

describe('Offboarding queue', () => {
  it('completes an offboarding once everything is back, and blocks it while returns are pending', async () => {
    const { user } = renderApp('/offboarding')
    const james = await card(/James Wilson/)
    expect(within(james).queryByRole('button', { name: /Complete offboarding/ })).not.toBeInTheDocument()

    const ryan = await card(/Ryan O’Connor/)
    await user.click(within(ryan).getByRole('button', { name: 'Complete offboarding for Ryan O’Connor' }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Complete offboarding?' }))
    await user.click(confirm.getByRole('button', { name: 'Complete offboarding' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Ryan O’Connor is fully offboarded')
    expect(statusOf('emp_ryan')).toBe('Inactive')
    expect(screen.queryByRole('button', { name: /Complete offboarding for Ryan/ })).not.toBeInTheDocument()
  })

  it('records a pending return straight from the card', async () => {
    const { user } = renderApp('/offboarding')
    const james = await card(/James Wilson/)
    await user.click(within(james).getByRole('button', { name: 'Record return of MacBook Pro 14" M1 Pro (EQ-LAP-0006)' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Record return' }))
    await user.click(dialog.getByRole('button', { name: 'Record return' }))

    expect(await within(james).findByText('1 pending return')).toBeInTheDocument()
  })

  it('starts offboarding for a chosen active employee', async () => {
    const { user } = renderApp('/offboarding')
    await user.click(await screen.findByRole('button', { name: 'Start offboarding' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Initiate offboarding' }))
    await user.selectOptions(dialog.getByLabelText('Employee'), 'emp_tom')
    expect(within(dialog.getByRole('list', { name: 'Equipment to recover' })).getAllByRole('listitem')).toHaveLength(1)
    await user.click(dialog.getByRole('button', { name: 'Start offboarding' }))

    expect(await screen.findByRole('link', { name: /Tom Becker/ })).toBeInTheDocument()
    expect(statusOf('emp_tom')).toBe('Offboarding')
  })
})

describe('Onboarding queue', () => {
  it('adds a new hire who appears in the queue', async () => {
    const { user } = renderApp('/onboarding')
    await user.click(await screen.findByRole('button', { name: 'Add new hire' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Add new hire' }))
    await user.type(dialog.getByLabelText(/Full name/), 'Ana Costa')
    await user.type(dialog.getByLabelText(/Work email/), 'ana.costa@equiply.dev')
    await user.selectOptions(dialog.getByLabelText(/Department/), 'Design')
    await user.type(dialog.getByLabelText(/Designation/), 'Brand Designer')
    await user.type(dialog.getByLabelText(/Location/), 'Remote · Lisbon')
    fireEvent.change(dialog.getByLabelText(/Start date/), { target: { value: '2026-12-01' } })
    await user.click(dialog.getByRole('button', { name: 'Add new hire' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Ana Costa added; onboarding started')
    expect(await screen.findByRole('link', { name: /^Ana Costa/ })).toBeInTheDocument()
  })

  it('completes onboarding only once the required equipment is allocated', async () => {
    const { user } = renderApp('/onboarding')
    await screen.findByRole('link', { name: /^Mei Tanaka/ })
    expect(screen.queryByRole('button', { name: /Complete onboarding for Mei Tanaka/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Complete onboarding for Omar Haddad' }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Complete onboarding?' }))
    await user.click(confirm.getByRole('button', { name: 'Complete onboarding' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Omar Haddad is onboarded')
    expect(statusOf('emp_omar')).toBe('Active')
  })
})

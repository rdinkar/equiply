import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Settings">
          <input aria-label="Name" data-autofocus />
        </Modal>
      )}
    </>
  )
}

describe('Modal', () => {
  it('focuses the marked field when it opens', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('returns focus to the control that opened it when it closes', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open settings' })
    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('cannot be dismissed while it is busy saving', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Saving" dismissible={false}>
        <p>Working…</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true })) // Escape
    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog) // backdrop

    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stays open when a text-selection drag is released on the backdrop', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    const dialog = screen.getByRole('dialog')

    fireEvent.mouseDown(screen.getByRole('textbox', { name: 'Name' }))
    fireEvent.click(dialog) // mouseup landed outside the panel
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog) // a real backdrop click
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps focus inside the surrounding dialog when the opener disappears', async () => {
    const user = userEvent.setup()
    render(<NestedHarness />)
    await user.click(screen.getByRole('button', { name: 'Open drawer' }))
    await user.click(screen.getByRole('button', { name: 'Retire' }))
    await user.click(screen.getByRole('button', { name: 'Confirm retire' }))

    const drawer = screen.getByRole('dialog', { name: 'Drawer' })
    expect(screen.queryByRole('button', { name: 'Retire' })).not.toBeInTheDocument()
    expect(drawer).toContainElement(document.activeElement as HTMLElement)
  })
})

function NestedHarness() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [retired, setRetired] = useState(false)
  return (
    <>
      <button onClick={() => setDrawerOpen(true)}>Open drawer</button>
      {drawerOpen && (
        <Modal open onClose={() => setDrawerOpen(false)} title="Drawer" variant="drawer-right">
          {!retired && <button onClick={() => setConfirmOpen(true)}>Retire</button>}
        </Modal>
      )}
      {confirmOpen && (
        <Modal open onClose={() => setConfirmOpen(false)} title="Confirm">
          <button
            onClick={() => {
              setRetired(true)
              setConfirmOpen(false)
            }}
          >
            Confirm retire
          </button>
        </Modal>
      )}
    </>
  )
}

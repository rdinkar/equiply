import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
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
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WarrantyLabel } from './StatusBadges'

describe('WarrantyLabel', () => {
  it('uses the singular for one day left', () => {
    render(<WarrantyLabel date="2026-11-17" today="2026-11-16" />)
    expect(screen.getByText('1 day left')).toBeInTheDocument()
  })

  it('counts plural days and flags expiry', () => {
    const { rerender } = render(<WarrantyLabel date="2026-11-28" today="2026-11-16" />)
    expect(screen.getByText('12 days left')).toBeInTheDocument()
    rerender(<WarrantyLabel date="2026-11-01" today="2026-11-16" />)
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })
})

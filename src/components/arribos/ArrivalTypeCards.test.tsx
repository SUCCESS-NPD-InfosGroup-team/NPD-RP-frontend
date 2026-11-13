import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ArrivalTypeCards } from './ArrivalTypeCards'
import type { ArrivalsSummary } from '../../services/arrivals.types'

const summary: ArrivalsSummary = {
  total: 2,
  byType: { PENDING_CONFIRMATION: 0, ASSIGNMENT_END: 1, CONTRACT_END: 0, PROBATION_END: 1, VACATION_START: 0 },
}

describe('ArrivalTypeCards', () => {
  it('selects and deselects a type', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ArrivalTypeCards summary={summary} selected="ASSIGNMENT_END" onSelect={onSelect} />)

    const selected = screen.getByRole('button', { name: /Fin de asignación/i })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    await user.click(selected)
    expect(onSelect).toHaveBeenCalledWith(undefined)

    await user.click(screen.getByRole('button', { name: /Fin de probatoria/i }))
    expect(onSelect).toHaveBeenCalledWith('PROBATION_END')
  })
})

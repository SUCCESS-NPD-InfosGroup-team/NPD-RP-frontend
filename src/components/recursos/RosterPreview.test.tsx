import { render, screen } from '@testing-library/react'
import { RosterPreview } from './RosterPreview'
import { formatShortDate } from '../../utils/dates'

describe('RosterPreview', () => {
  it('shows the probation and the end-of-assignment notices like the roster', () => {
    const { container } = render(
      <RosterPreview
        today="2026-10-07"
        hireDate="2026-08-03"
        probationEnd="2026-11-01"
        inProbation
        project={{ name: 'Programa de automatización (DEYEL)', endDate: '2026-10-31', indefinite: false }}
      />,
    )
    expect(Array.from(container.querySelectorAll('.roster-preview__months span'), (month) => month.textContent))
      .toEqual(['', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic', 'ene'])
    expect(screen.getByText('Día 90 el 01 nov 2026, desde el contrato')).toBeInTheDocument()
    expect(screen.getByText('01 oct y 16 oct · Programa de automatización (DEYEL)')).toBeInTheDocument()
    expect(screen.getByText('03 ago')).toBeInTheDocument()
    expect(container.querySelectorAll('.roster-preview__notice')).toHaveLength(2)
    expect(container.querySelector('.roster-preview__probation')).toBeInTheDocument()
  })

  it('keeps today visible when the hire date is old and leaves the bar open when indefinite', () => {
    const { container } = render(
      <RosterPreview today="2026-10-26" hireDate="2020-01-15" probationEnd="2020-04-14" inProbation={false} project={{ indefinite: true }} />,
    )
    expect(container.querySelector('.roster-preview__months span:nth-child(2)')).toHaveTextContent('jul')
    expect(container.querySelector('.roster-preview__bar')).toHaveClass('is-open')
    expect(container.querySelector('.roster-preview__probation')).not.toBeInTheDocument()
    expect(screen.getByText('Sin avisos: la asignación es indefinida')).toBeInTheDocument()
  })

  it('shows a person without project', () => {
    render(<RosterPreview today="2026-10-26" hireDate="2026-10-20" probationEnd="2027-01-18" inProbation />)
    expect(screen.getByText('Sin proyecto')).toBeInTheDocument()
    expect(screen.queryByText('Avisos fin')).not.toBeInTheDocument()
    expect(formatShortDate('2027-01-18', true)).toBe('18 ene 2027')
  })
})

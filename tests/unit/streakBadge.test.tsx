import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StreakBadge from '@/components/streak-badge'

describe('StreakBadge', () => {
  it('renders nothing for 0 days', () => {
    const { container } = render(<StreakBadge days={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders plain text for 1-2 days (no emoji)', () => {
    render(<StreakBadge days={2} />)
    expect(screen.getByText(/2 days/)).toBeInTheDocument()
  })

  it('renders single flame for 3-6 days', () => {
    render(<StreakBadge days={5} />)
    expect(screen.getByText(/🔥/)).toBeInTheDocument()
    expect(screen.getByText(/5 days/)).toBeInTheDocument()
  })

  it('renders orange badge for 7-13 days', () => {
    render(<StreakBadge days={9} />)
    const badge = screen.getByText(/🔥 9 days/)
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('orange')
  })

  it('renders double flame for 14-29 days', () => {
    render(<StreakBadge days={21} />)
    expect(screen.getByText(/🔥🔥/)).toBeInTheDocument()
    expect(screen.getByText(/21 days/)).toBeInTheDocument()
  })

  it('renders triple flame for 30-49 days', () => {
    render(<StreakBadge days={34} />)
    expect(screen.getByText(/🔥🔥🔥/)).toBeInTheDocument()
    expect(screen.getByText(/34 days/)).toBeInTheDocument()
  })

  it('renders lightning+flame for 50-99 days', () => {
    render(<StreakBadge days={67} />)
    expect(screen.getByText(/⚡🔥/)).toBeInTheDocument()
    expect(screen.getByText(/67 days/)).toBeInTheDocument()
  })

  it('renders crown for 100+ days', () => {
    render(<StreakBadge days={112} />)
    expect(screen.getByText(/👑🔥/)).toBeInTheDocument()
    expect(screen.getByText(/112 days/)).toBeInTheDocument()
  })

  it('renders correct day count', () => {
    render(<StreakBadge days={23} />)
    expect(screen.getByText(/23/)).toBeInTheDocument()
  })
})

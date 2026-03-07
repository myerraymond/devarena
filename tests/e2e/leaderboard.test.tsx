import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import LeaderboardTable from '@/app/components/LeaderboardTable'

const mockData = [
  {
    rank: 1,
    username: 'myer',
    display_name: 'Myer',
    weekHours: 0,
    monthHours: 0,
    allTimeHours: 0,
    weekScore: 500,
    monthScore: 1000,
    weekCommits: 50,
    monthCommits: 100,
    yearCommits: 500,
    allTimeCommits: 1000,
    commits: 50,
    streak: 14,
    top_language: 'TypeScript',
    followers: 100,
    stars: 50,
    publicRepos: 20,
    is_active: true,
    score: 500,
  },
  {
    rank: 2,
    username: 'alice',
    display_name: 'Alice',
    weekHours: 0,
    monthHours: 0,
    allTimeHours: 0,
    weekScore: 400,
    monthScore: 800,
    weekCommits: 40,
    monthCommits: 80,
    yearCommits: 400,
    allTimeCommits: 800,
    commits: 40,
    streak: 7,
    top_language: 'Python',
    followers: 50,
    stars: 25,
    publicRepos: 10,
    is_active: false,
    score: 400,
  },
  {
    rank: 3,
    username: 'bob',
    display_name: 'Bob',
    weekHours: 0,
    monthHours: 0,
    allTimeHours: 0,
    weekScore: 300,
    monthScore: 600,
    weekCommits: 30,
    monthCommits: 60,
    yearCommits: 300,
    allTimeCommits: 600,
    commits: 30,
    streak: 0,
    top_language: 'Rust',
    followers: 25,
    stars: 10,
    publicRepos: 5,
    is_active: true,
    score: 300,
  },
]

describe('LeaderboardTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders leaderboard rows with usernames', () => {
    render(<LeaderboardTable data={mockData} />)
    // The table displays the username field, not display_name
    expect(screen.getByText('myer')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('shows correct rank numbers', () => {
    render(<LeaderboardTable data={mockData} />)
    const cells = screen.getAllByRole('cell')
    const rankTexts = cells
      .map((c) => c.textContent?.trim())
      .filter((t) => t === '1' || t === '2' || t === '3')
    expect(rankTexts).toContain('1')
    expect(rankTexts).toContain('2')
    expect(rankTexts).toContain('3')
  })

  it('shows languages in the table', () => {
    render(<LeaderboardTable data={mockData} />)
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Rust')).toBeInTheDocument()
  })

  it('highlights current user row with "You" badge', () => {
    render(<LeaderboardTable data={mockData} currentUsername="alice" />)
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(
      <LeaderboardTable
        data={[]}
        emptyMessage="No builders found matching 'xyz'"
      />
    )
    expect(
      screen.getByText("No builders found matching 'xyz'")
    ).toBeInTheDocument()
  })

  it('shows appended user row when provided', () => {
    const appendedUser = {
      ...mockData[1],
      rank: 42,
      username: 'current-user',
      display_name: 'Current User',
    }
    render(
      <LeaderboardTable
        data={mockData}
        currentUsername="current-user"
        appendedUserRow={appendedUser}
      />
    )
    // The table renders username, not display_name
    expect(screen.getByText('current-user')).toBeInTheDocument()
  })

  it('shows league badges when provided', () => {
    render(
      <LeaderboardTable
        data={mockData}
        leagueTiers={{ myer: 'diamond', alice: 'gold' }}
      />
    )
    expect(screen.getByText(/Diamond/)).toBeInTheDocument()
    expect(screen.getByText(/Gold/)).toBeInTheDocument()
  })

  it('shows language king crowns when provided', () => {
    render(
      <LeaderboardTable
        data={mockData}
        languageKings={{ myer: ['TypeScript'] }}
      />
    )
    expect(screen.getByText(/👑/)).toBeInTheDocument()
  })
})

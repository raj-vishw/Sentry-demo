import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChallengeCard } from './ChallengeCard';
import type { Challenge } from '@/types';

const baseChallenge: Challenge = {
  id: 'c-01',
  slug: 'shadow-login',
  title: 'Shadow Login',
  shortDescription: '',
  category: 'web',
  type: 'STATIC',
  difficulty: 'medium',
  points: 300,
  description: 'Test challenge',
  solveCount: 214,
  solved: false,
  author: 'r00tkit',
  files: [],
  hints: [],
  tags: [],
  createdAt: '2026-08-01T10:00:00Z',
  status: 'PUBLISHED',
  locked: false,
  firstBlood: null,
  unlockRequirement: null,
  environment: null,
};

function renderCard(challenge: Challenge) {
  return render(
    <MemoryRouter>
      <ChallengeCard challenge={challenge} />
    </MemoryRouter>,
  );
}

describe('ChallengeCard', () => {
  it('renders title, category, difficulty (accessibly), and points', () => {
    renderCard(baseChallenge);
    expect(screen.getByText('Shadow Login')).toBeInTheDocument();
    expect(screen.getByText('[Web]')).toBeInTheDocument();
    expect(screen.getByText('Medium difficulty')).toBeInTheDocument();
    expect(screen.getByText('300 pts')).toBeInTheDocument();
  });

  it('links to the challenge detail route', () => {
    renderCard(baseChallenge);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/challenges/shadow-login');
  });

  it('shows a solved indicator instead of points only when solved', () => {
    const { rerender } = renderCard(baseChallenge);
    expect(screen.queryByText('✓ solved')).not.toBeInTheDocument();
    expect(screen.getByText('300 pts')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ChallengeCard challenge={{ ...baseChallenge, solved: true }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('✓ solved')).toBeInTheDocument();
    expect(screen.queryByText('300 pts')).not.toBeInTheDocument();
  });

  it('shows a locked indicator and no points/solved status when locked', () => {
    renderCard({ ...baseChallenge, locked: true });
    expect(screen.getByLabelText('Locked')).toBeInTheDocument();
    expect(screen.getByText('locked')).toBeInTheDocument();
    expect(screen.queryByText('300 pts')).not.toBeInTheDocument();
  });
});

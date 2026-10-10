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
  it('renders title, category, difficulty, points, and solve count', () => {
    renderCard(baseChallenge);
    expect(screen.getByText('Shadow Login')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('300 XP')).toBeInTheDocument();
    expect(screen.getByText('214 solves')).toBeInTheDocument();
  });

  it('links to the challenge detail route', () => {
    renderCard(baseChallenge);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/challenges/shadow-login');
  });

  it('shows a solved indicator only when solved', () => {
    const { rerender } = renderCard(baseChallenge);
    expect(screen.queryByLabelText('Solved')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ChallengeCard challenge={{ ...baseChallenge, solved: true }} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Solved')).toBeInTheDocument();
  });
});

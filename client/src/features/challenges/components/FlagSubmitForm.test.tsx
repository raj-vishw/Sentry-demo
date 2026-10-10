import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlagSubmitForm } from './FlagSubmitForm';

vi.mock('@/services/challengeService', () => ({
  challengeService: { submitFlag: vi.fn() },
}));

const { challengeService } = await import('@/services/challengeService');

function renderForm(solved = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onSolved = vi.fn();
  const onLog = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <FlagSubmitForm challengeId="chal-1" slug="shadow-login" solved={solved} onSolved={onSolved} onLog={onLog} />
    </QueryClientProvider>,
  );
  return { ...utils, onSolved, onLog };
}

describe('FlagSubmitForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows an already-solved banner instead of a form when solved is true', () => {
    renderForm(true);
    expect(screen.getByText(/already solved/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Flag')).not.toBeInTheDocument();
  });

  it('requires a non-empty flag before submitting', async () => {
    const { onLog } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('Enter a flag before submitting.')).toBeInTheDocument();
    expect(challengeService.submitFlag).not.toHaveBeenCalled();
    expect(onLog).not.toHaveBeenCalled();
  });

  it('logs a correct submission and calls onSolved with the awarded points', async () => {
    vi.mocked(challengeService.submitFlag).mockResolvedValue({
      correct: true,
      alreadySolved: false,
      pointsAwarded: 300,
      message: 'Challenge solved.',
      newAchievements: [],
    });

    const { onSolved, onLog } = renderForm();
    // Avoids curly braces — user-event's type() treats "{..}" as key syntax.
    await userEvent.type(screen.getByLabelText('Flag'), 'correct-flag-value');
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    await vi.waitFor(() => expect(onSolved).toHaveBeenCalledWith(300));
    expect(challengeService.submitFlag).toHaveBeenCalledWith('chal-1', 'correct-flag-value');
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'success', message: expect.stringContaining('+300 XP') }),
    );
  });

  it('logs an incorrect flag without calling onSolved', async () => {
    vi.mocked(challengeService.submitFlag).mockResolvedValue({
      correct: false,
      alreadySolved: false,
      pointsAwarded: 0,
      message: 'Incorrect flag.',
      newAchievements: [],
    });

    const { onSolved, onLog } = renderForm();
    await userEvent.type(screen.getByLabelText('Flag'), 'wrong-flag-value');
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    await vi.waitFor(() =>
      expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error', message: 'Incorrect flag.' })),
    );
    expect(onSolved).not.toHaveBeenCalled();
  });
});

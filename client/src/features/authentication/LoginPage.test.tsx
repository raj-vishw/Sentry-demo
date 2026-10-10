import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
  },
}));

const { authService } = await import('@/services/authService');

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  });

  it('shows validation errors when submitted empty', async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole('button', { name: 'Access System' }));
    expect(await screen.findByText('Enter your username or email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your authorization key.')).toBeInTheDocument();
  });

  it('authenticates and stores the session on valid submission', async () => {
    const mockUser = {
      id: '1',
      username: 'operator_01',
      email: 'operator_01@example.com',
      role: 'user' as const,
      xp: 100,
      rank: 10,
      solvedCount: 2,
      streak: 1,
      teamId: null,
      teamName: null,
      createdAt: new Date().toISOString(),
    };
    vi.mocked(authService.login).mockResolvedValue({ user: mockUser, token: 'mock.1' });

    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Identifier'), 'operator_01');
    await userEvent.type(screen.getByLabelText('Authorization Key'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Access System' }));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().user?.username).toBe('operator_01');
  });

  it('shows a server error message when login fails', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Access denied.'));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Identifier'), 'operator_01');
    await userEvent.type(screen.getByLabelText('Authorization Key'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Access System' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied.');
  });
});

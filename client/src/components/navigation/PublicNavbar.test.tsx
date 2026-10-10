import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicNavbar } from './PublicNavbar';
import { CommandPaletteProvider } from '@/features/search/CommandPaletteProvider';

function renderNavbar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommandPaletteProvider>
          <PublicNavbar />
        </CommandPaletteProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicNavbar', () => {
  it('renders primary navigation links and auth actions', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Docs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
  });

  it('no longer promotes Explore/Leaderboard to a logged-out visitor', () => {
    renderNavbar();
    expect(screen.queryByRole('link', { name: 'Explore' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Leaderboard' })).not.toBeInTheDocument();
  });

  it('opens and closes the mobile menu', async () => {
    renderNavbar();
    const toggle = screen.getByLabelText('Open menu');
    await userEvent.click(toggle);
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Close menu'));
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('associates the label with the input via htmlFor/id', () => {
    render(<Input label="Identifier" />);
    expect(screen.getByLabelText('Identifier')).toBeInTheDocument();
  });

  it('accepts typed input', async () => {
    render(<Input label="Identifier" />);
    const input = screen.getByLabelText('Identifier');
    await userEvent.type(input, 'operator_01');
    expect(input).toHaveValue('operator_01');
  });

  it('shows an error message and marks the field invalid', () => {
    render(<Input label="Identifier" error="Enter your username or email." />);
    const input = screen.getByLabelText('Identifier');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your username or email.');
  });

  it('does not render an error when none is provided', () => {
    render(<Input label="Identifier" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

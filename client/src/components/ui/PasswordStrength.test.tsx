import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getPasswordStrength, PasswordStrength } from './PasswordStrength';

describe('getPasswordStrength', () => {
  it('scores an empty password as 0 with no label', () => {
    expect(getPasswordStrength('')).toEqual({ score: 0, label: '' });
  });

  it('scores a short lowercase-only password as weak', () => {
    expect(getPasswordStrength('abc').score).toBeLessThanOrEqual(1);
  });

  it('scores a long mixed-case password with digits and symbols as very strong', () => {
    expect(getPasswordStrength('Sup3r!Secret_Passphrase').score).toBe(4);
  });
});

describe('PasswordStrength', () => {
  it('renders nothing when the password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a strength label for a non-empty password', () => {
    render(<PasswordStrength password="Sup3r!Secret_Passphrase" />);
    expect(screen.getByText('Very strong')).toBeInTheDocument();
  });
});

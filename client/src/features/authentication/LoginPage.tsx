import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fingerprint, ShieldCheck, User as UserIcon } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { AuthButton, AuthDivider, AuthError } from './components/AuthPrimitives';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { loginSchema, type LoginFormValues } from './schemas';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AuthCredentials, User } from '@/types';

// Fixed, intentionally-public demo accounts — see server/.env.example's
// DEMO_ADMIN_*/DEMO_USER_* and README.md/SECURITY.md. Never secrets.
const DEMO_USER_CREDENTIALS: AuthCredentials = { identifier: 'user', password: 'user' };
const DEMO_ADMIN_CREDENTIALS: AuthCredentials = { identifier: 'admin', password: 'admin' };

export function LoginPage() {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const pushToast = useUiStore((s) => s.pushToast);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickLoginInFlight, setQuickLoginInFlight] = useState<'user' | 'admin' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  function redirectAfterLogin(user: User) {
    pushToast({ title: 'Access granted', description: `Welcome back, ${user.username}.`, variant: 'success' });
    const redirectTo =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app/dashboard';
    navigate(redirectTo, { replace: true });
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const { user, token } = await authService.login(values);
      setSession(user, token);
      redirectAfterLogin(user);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Access denied.');
    }
  }

  async function quickLogin(role: 'user' | 'admin') {
    setServerError(null);
    setQuickLoginInFlight(role);
    try {
      // The admin demo account deliberately authenticates through the
      // same separate, hidden admin-login endpoint a real deployment
      // uses — this button is just a UI convenience over that same
      // split-login design, not a bypass of it.
      const { user, token } =
        role === 'admin'
          ? await authService.adminLogin(DEMO_ADMIN_CREDENTIALS)
          : await authService.login(DEMO_USER_CREDENTIALS);
      setSession(user, token);
      redirectAfterLogin(user);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Access denied.');
    } finally {
      setQuickLoginInFlight(null);
    }
  }

  return (
    <AuthLayout
      title="System Access"
      subtitle="Authenticate to enter the arena and continue your campaign."
      eyebrow="// sentry · sign-in"
      aside={<SystemStatusPanel />}
    >
      <div className="flex flex-col gap-5">
        {serverError && <AuthError>{serverError}</AuthError>}

        <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3.5 py-3 text-sm text-[var(--color-text-secondary)]">
          <p className="font-medium text-[var(--color-text-primary)]">This is a public demo.</p>
          <p className="mt-1">
            Use either account below — credentials are intentionally public, not secrets.
          </p>
          <p className="mt-2 font-mono text-xs">
            User: <span className="text-[var(--color-text-primary)]">user</span> /{' '}
            <span className="text-[var(--color-text-primary)]">user</span>
            <span className="mx-2 text-[var(--color-text-muted)]">·</span>
            Admin: <span className="text-[var(--color-text-primary)]">admin</span> /{' '}
            <span className="text-[var(--color-text-primary)]">admin</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            leftIcon={<UserIcon className="size-4" />}
            isLoading={quickLoginInFlight === 'user'}
            disabled={quickLoginInFlight !== null}
            onClick={() => quickLogin('user')}
          >
            Login as user
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            leftIcon={<ShieldCheck className="size-4" />}
            isLoading={quickLoginInFlight === 'admin'}
            disabled={quickLoginInFlight !== null}
            onClick={() => quickLogin('admin')}
          >
            Login as admin
          </Button>
        </div>

        <AuthDivider label="OR SIGN IN MANUALLY" />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <Input
            label="Identifier"
            mono
            placeholder="username or email"
            autoComplete="username"
            error={errors.identifier?.message}
            {...register('identifier')}
          />

          <PasswordInput
            label="Authorization Key"
            placeholder="••••••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <AuthButton
            type="submit"
            isLoading={isSubmitting}
            disabled={quickLoginInFlight !== null}
            leftIcon={<Fingerprint className="size-4" />}
          >
            Access System
          </AuthButton>
        </form>
      </div>
    </AuthLayout>
  );
}

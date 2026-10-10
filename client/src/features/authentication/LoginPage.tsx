import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fingerprint } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { AuthButton, AuthError } from './components/AuthPrimitives';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { loginSchema, type LoginFormValues } from './schemas';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LoginPage() {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const pushToast = useUiStore((s) => s.pushToast);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const { user, token } = await authService.login(values);
      setSession(user, token);
      pushToast({ title: 'Access granted', description: `Welcome back, ${user.username}.`, variant: 'success' });
      const redirectTo =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Access denied.');
    }
  }

  return (
    <AuthLayout
      title="System Access"
      subtitle="Authenticate to enter the arena and continue your campaign."
      eyebrow="Sentry OS · Sign-in"
      aside={<SystemStatusPanel />}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {serverError && <AuthError>{serverError}</AuthError>}

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

        <AuthButton type="submit" isLoading={isSubmitting} leftIcon={<Fingerprint className="size-4" />}>
          Access System
        </AuthButton>

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Don&apos;t have an identity?{' '}
          <Link to="/register" className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            Create account
          </Link>
        </p>

        {import.meta.env.DEV && (
          <p className="text-center font-mono text-[11px] text-[var(--color-text-muted)]">
            Dev seed: admin@dev.local / DevAdmin123! — run{' '}
            <code className="text-[var(--color-text-secondary)]">npm run seed</code> in server/ to create it.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}

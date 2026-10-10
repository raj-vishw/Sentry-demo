import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
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

/**
 * Deliberately not linked from anywhere in the UI (no nav link, no link
 * from the public LoginPage) — reachable only by knowing this URL, which
 * lives at the same obscure prefix as the admin API (ADMIN_PREFIX, see
 * apiClient.ts). The backend independently rejects non-ADMIN accounts here
 * regardless of what this page does, so this is defense-in-depth, not the
 * real access control.
 */
export function AdminLoginPage() {
  useDocumentTitle('Admin Access');
  const navigate = useNavigate();
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
      const { user, token } = await authService.adminLogin(values);
      setSession(user, token);
      pushToast({ title: 'Access granted', description: `Welcome back, ${user.username}.`, variant: 'success' });
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Access denied.');
    }
  }

  return (
    <AuthLayout
      title="Operator Access"
      subtitle="Restricted entry point. Unauthorized attempts are logged."
      eyebrow="Sentry OS · Admin"
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

        <AuthButton type="submit" isLoading={isSubmitting} leftIcon={<ShieldCheck className="size-4" />}>
          Authenticate
        </AuthButton>
      </form>
    </AuthLayout>
  );
}

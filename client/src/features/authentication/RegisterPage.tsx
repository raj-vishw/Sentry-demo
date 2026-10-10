import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { AuthButton, AuthError } from './components/AuthPrimitives';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { registerSchema, type RegisterFormValues } from './schemas';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function RegisterPage() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const pushToast = useUiStore((s) => s.pushToast);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const password = watch('password') ?? '';

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const { user, pending, token } = await authService.register(values);
      if (pending) {
        pushToast({
          title: 'Registration submitted',
          description: 'An admin needs to approve your account before you can log in.',
          variant: 'info',
        });
        navigate('/login', { replace: true });
        return;
      }
      setSession(user, token!);
      pushToast({
        title: 'Identity created',
        description: `Welcome to the arena, ${user.username}.`,
        variant: 'success',
      });
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed.');
    }
  }

  return (
    <AuthLayout
      title="Create Your Identity"
      subtitle="Register an operator profile to start tracking solves, XP, and rank."
      eyebrow="Sentry OS · Registration"
      aside={<SystemStatusPanel />}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {serverError && <AuthError>{serverError}</AuthError>}

        <Input
          label="Username"
          mono
          placeholder="operator_01"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@domain.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          label="Confirm Password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <AuthButton type="submit" isLoading={isSubmitting} leftIcon={<UserPlus className="size-4" />}>
          Create Account
        </AuthButton>

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Already have an identity?{' '}
          <Link to="/login" className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            Access system
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

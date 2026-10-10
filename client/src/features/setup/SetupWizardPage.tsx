import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthButton, AuthError } from '@/features/authentication/components/AuthPrimitives';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { registerSchema, type RegisterFormValues } from '@/features/authentication/schemas';
import { setupService } from '@/services/setupService';
import { useSetupStore } from '@/stores/setupStore';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Shown instead of the login page the very first time this deployment runs
 * — AuthGate checks `GET /setup/status` once on boot and AppRouter renders
 * this ahead of the normal authenticated/public split whenever no admin has
 * been created yet. Reuses the same form/validation/visual conventions as
 * LoginPage/RegisterPage (same schema even — creating the first admin is
 * identical to registering, just forced to role ADMIN server-side).
 */
export function SetupWizardPage() {
  useDocumentTitle('System Initialization');
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setNeedsSetup = useSetupStore((s) => s.setNeedsSetup);
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
      const { user, token } = await setupService.initialize(values);
      setSession(user, token);
      setNeedsSetup(false);
      pushToast({ title: 'Boot complete', description: `Welcome to Sentry OS, ${user.username}.`, variant: 'success' });
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'System initialization failed.');
    }
  }

  return (
    <AuthLayout
      title="System Initialization"
      subtitle="No administrator exists yet. Create the root account to boot this deployment."
      eyebrow="Sentry OS · First Boot"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {serverError && <AuthError>{serverError}</AuthError>}

        <Input
          label="Username"
          mono
          placeholder="root"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="admin@yourdomain.com"
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

        <AuthButton type="submit" isLoading={isSubmitting} leftIcon={<ShieldCheck className="size-4" />}>
          Initialize System
        </AuthButton>
      </form>
    </AuthLayout>
  );
}

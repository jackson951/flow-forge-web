import { zodResolver } from '@hookform/resolvers/zod';
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  LoaderCircle,
  Mail,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, IconInput, PasswordInput } from '@/components/ui';
import { isConflict } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { paths, safeNextPath } from '@/lib/routes';
import { useRegister } from '../api/auth.api';
import { useRetryCountdown } from '../hooks/use-retry-countdown';
import { registerFormSchema, type RegisterFormInput } from '../schemas/auth.schemas';
import { serverErrors } from '../utils/server-errors';

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const registerUser = useRegister();
  const wait = useRetryCountdown(registerUser.error);
  const server = serverErrors(registerUser.error, ['name', 'email', 'password'] as const);
  // 409: the email is taken — show it on the email field, with a way to sign in instead.
  const emailTaken = isConflict(registerUser.error);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormInput>({ resolver: zodResolver(registerFormSchema), mode: 'onTouched' });
  const password = useWatch({ control, name: 'password' }) ?? '';

  // Registration signs the user in; they land in their new workspace (created by the backend).
  const onSubmit = handleSubmit(({ confirmPassword: _confirm, ...values }) => {
    if (registerUser.isPending || wait > 0) return;
    registerUser.mutate(values, {
      onSuccess: () => navigate(next ?? paths.home, { replace: true }),
    });
  });

  const emailError =
    errors.email?.message ??
    server.fields.email ??
    (emailTaken ? 'An account with this email already exists.' : undefined);
  const checks = [
    { ok: password.length >= 12, text: 'At least 12 characters' },
    { ok: password.length > 0 && password.length <= 128, text: 'At most 128 characters' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="text-muted mt-1 text-sm">You’ll get a workspace of your own to start in.</p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-8 space-y-5"
        aria-busy={registerUser.isPending}
      >
        <Field id="name" label="Name" error={errors.name?.message ?? server.fields.name}>
          <IconInput
            icon={UserRound}
            id="name"
            autoComplete="name"
            autoFocus
            maxLength={100}
            aria-invalid={!!(errors.name ?? server.fields.name)}
            aria-describedby="name-msg"
            {...register('name')}
          />
        </Field>
        <div>
          <Field id="email" label="Email" error={emailError}>
            <IconInput
              icon={Mail}
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              aria-invalid={!!emailError}
              aria-describedby="email-msg"
              {...register('email')}
            />
          </Field>
          {emailTaken && (
            <p className="mt-1 text-sm">
              <Link
                to={paths.login}
                className="text-primary font-medium underline underline-offset-4"
              >
                Sign in instead
              </Link>
            </p>
          )}
        </div>
        <Field
          id="password"
          label="Password"
          error={errors.password?.message ?? server.fields.password}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={!!(errors.password ?? server.fields.password)}
            describedBy="password-msg password-checks"
            {...register('password')}
          />
        </Field>
        <ul
          id="password-checks"
          aria-label="Password requirements"
          className="-mt-3 space-y-0.5 text-xs"
        >
          {checks.map((c) => (
            <li
              key={c.text}
              className={cn(
                'flex items-center gap-1.5',
                c.ok ? 'text-status-succeeded' : 'text-muted',
              )}
            >
              {c.ok ? (
                <CircleCheck className="size-3.5" aria-hidden />
              ) : (
                <CircleDashed className="size-3.5" aria-hidden />
              )}
              {c.text}
              <span className="sr-only">{c.ok ? '(met)' : '(not met yet)'}</span>
            </li>
          ))}
        </ul>
        <Field
          id="confirm-password"
          label="Confirm password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={!!errors.confirmPassword}
            describedBy="confirm-password-msg"
            {...register('confirmPassword')}
          />
        </Field>
        {server.form && !emailTaken && (
          <p role="alert" className="text-status-failed flex items-start gap-1.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {server.form}
          </p>
        )}
        {wait > 0 && (
          <p role="alert" className="text-status-failed flex items-center gap-1.5 text-sm">
            <Clock className="size-4 shrink-0" aria-hidden />
            Too many attempts. Try again in {wait} s.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={registerUser.isPending || wait > 0}>
          {registerUser.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="size-4" aria-hidden />
          )}
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-muted mt-6 text-sm">
        Already have an account?{' '}
        <Link to={paths.login} className="text-primary font-medium underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

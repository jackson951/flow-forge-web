import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Clock, LoaderCircle, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, IconInput, PasswordInput } from '@/components/ui';
import { paths, safeNextPath } from '@/lib/routes';
import { useLogin } from '../api/auth.api';
import { SessionNotice } from '../components/session-notice';
import { useRetryCountdown } from '../hooks/use-retry-countdown';
import { loginSchema, type LoginInput } from '../schemas/auth.schemas';
import { useSession } from '../session/use-session';
import { serverErrors } from '../utils/server-errors';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const { endReason } = useSession();
  const login = useLogin();
  const wait = useRetryCountdown(login.error);
  const server = serverErrors(login.error, ['email', 'password'] as const);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    // One request at a time (Enter pressed twice, double click).
    if (login.isPending || wait > 0) return;
    login.mutate(values, { onSuccess: () => navigate(next ?? paths.home, { replace: true }) });
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted mt-1 text-sm">Use the email you registered with.</p>
      <SessionNotice reason={login.isIdle ? endReason : null} />

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5" aria-busy={login.isPending}>
        <Field id="email" label="Email" error={errors.email?.message ?? server.fields.email}>
          <IconInput
            icon={Mail}
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            maxLength={254}
            aria-invalid={!!(errors.email ?? server.fields.email)}
            aria-describedby="email-msg"
            {...register('email')}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password?.message ?? server.fields.password}
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            maxLength={128}
            aria-invalid={!!(errors.password ?? server.fields.password)}
            describedBy="password-msg"
            {...register('password')}
          />
        </Field>
        {server.form && (
          <p role="alert" className="text-status-failed flex items-start gap-1.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {server.form}
          </p>
        )}
        {wait > 0 && (
          <p role="alert" className="text-status-failed flex items-center gap-1.5 text-sm">
            <Clock className="size-4 shrink-0" aria-hidden />
            Too many sign-in attempts. Try again in {wait} s.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending || wait > 0}>
          {login.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="size-4" aria-hidden />
          )}
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-muted mt-6 text-sm">
        New to FlowForge?{' '}
        <Link
          to={next ? `${paths.register}?next=${encodeURIComponent(next)}` : paths.register}
          className="text-primary font-medium underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

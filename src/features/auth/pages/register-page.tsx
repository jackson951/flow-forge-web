import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, Input } from '@/components/ui';
import { isConflict } from '@/lib/api-client';
import { paths, safeNextPath } from '@/lib/routes';
import { useRegister } from '../api/auth.api';
import { useRetryCountdown } from '../hooks/use-retry-countdown';
import { registerSchema, type RegisterInput } from '../schemas/auth.schemas';
import { serverErrors } from '../utils/server-errors';

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const registerUser = useRegister();
  const wait = useRetryCountdown(registerUser.error);
  const server = serverErrors(registerUser.error, ['name', 'email', 'password'] as const);
  // 409: the email is taken — show it on the email field.
  const emailTaken = isConflict(registerUser.error) ? registerUser.error.message : undefined;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // Registration signs the user in; they land in their new workspace.
  const onSubmit = handleSubmit((values) =>
    registerUser.mutate(values, {
      onSuccess: () => navigate(next ?? paths.home, { replace: true }),
    }),
  );

  const emailError = errors.email?.message ?? server.fields.email ?? emailTaken;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="text-muted mt-1 text-sm">You’ll get a workspace of your own to start in.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field id="name" label="Name" error={errors.name?.message ?? server.fields.name}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!(errors.name ?? server.fields.name)}
            aria-describedby="name-msg"
            {...register('name')}
          />
        </Field>
        <Field id="email" label="Email" error={emailError}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!emailError}
            aria-describedby="email-msg"
            {...register('email')}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password?.message ?? server.fields.password}
          hint="At least 12 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!(errors.password ?? server.fields.password)}
            aria-describedby="password-msg"
            {...register('password')}
          />
        </Field>
        {server.form && !emailTaken && (
          <p role="alert" className="text-status-failed text-sm">
            {server.form}
          </p>
        )}
        {wait > 0 && (
          <p role="alert" className="text-status-failed text-sm">
            Too many attempts. Try again in {wait} s.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={registerUser.isPending || wait > 0}>
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-muted mt-6 text-sm">
        Already have an account?{' '}
        <Link to={paths.login} className="text-ink font-medium underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

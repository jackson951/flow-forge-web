import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button, Field, Input } from '@/components/ui';
import { useLogin } from '../api/auth.api';
import { loginSchema, type LoginInput } from '../schemas/auth.schemas';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => navigate('/') }),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted mt-1 text-sm">Use the email you registered with.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby="email-msg"
            {...register('email')}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby="password-msg"
            {...register('password')}
          />
        </Field>
        {login.error && (
          <p role="alert" className="text-status-failed text-sm">
            {login.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-muted mt-6 text-sm">
        New to FlowForge?{' '}
        <Link to="/register" className="text-ink font-medium underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}

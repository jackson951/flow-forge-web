import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button, Field, Input } from '@/components/ui';
import { useRegister } from '../api/auth.api';
import { registerSchema, type RegisterInput } from '../schemas/auth.schemas';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) =>
    registerUser.mutate(values, { onSuccess: () => navigate('/login') }),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="text-muted mt-1 text-sm">You’ll get a workspace of your own to start in.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field id="name" label="Name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby="name-msg"
            {...register('name')}
          />
        </Field>
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
        <Field
          id="password"
          label="Password"
          error={errors.password?.message}
          hint="At least 12 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby="password-msg"
            {...register('password')}
          />
        </Field>
        {registerUser.error && (
          <p role="alert" className="text-status-failed text-sm">
            {registerUser.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={registerUser.isPending}>
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-muted mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-ink font-medium underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { authResponse, WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import { session } from '../session/session';

/** No refresh cookie: the visitor is signed out. */
const signedOut = () =>
  server.use(
    http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
  );

async function fillLogin(email = 'ada@example.test', password = 'correct horse battery') {
  await userEvent.type(await screen.findByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage (Part 02)', () => {
  beforeEach(signedOut);

  it('a first visit shows no "session ended" notice', async () => {
    renderRoute('/login');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    // Let the background session check (refresh → 401) finish.
    await waitFor(() => expect(session.getState().status).toBe('anonymous'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows validation errors instead of submitting an empty form', async () => {
    renderRoute('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
  });

  it('signs in and lands in the workspace (AC-02.1)', async () => {
    const { router } = renderRoute('/login');
    await fillLogin();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}`));
    expect(session.getState()).toMatchObject({ status: 'authenticated', user: authResponse.user });
  });

  it('returns to ?next= after signing in (AC-02.5)', async () => {
    const { router } = renderRoute(
      `/login?next=${encodeURIComponent(`/w/${WS_ID}/runs?status=FAILED`)}`,
    );
    await fillLogin();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}/runs`));
    expect(router.state.location.search).toBe('?status=FAILED');
  });

  it.each(['https://evil.example/', '//evil.example/x'])(
    'ignores an off-site ?next=%s (AC-02.5)',
    async (next) => {
      const { router } = renderRoute(`/login?next=${encodeURIComponent(next)}`);
      await fillLogin();
      await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}`));
    },
  );

  it('shows the backend message for wrong credentials', async () => {
    server.use(http.post(`${API}/auth/login`, () => apiError(401, 'Invalid email or password')));
    renderRoute('/login');
    await fillLogin();
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(session.getState().status).toBe('anonymous');
  });

  it('shows the wait from Retry-After on 429 and keeps the button disabled (AC-02.7)', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        apiError(429, 'ThrottlerException: Too Many Requests', {
          error: 'Too Many Requests',
          headers: { 'Retry-After': '42' },
        }),
      ),
    );
    renderRoute('/login');
    await fillLogin();
    expect(
      await screen.findByText('Too many sign-in attempts. Try again in 42 s.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('puts server validation messages on their fields', async () => {
    server.use(http.post(`${API}/auth/login`, () => apiError(400, ['email must be an email'])));
    renderRoute('/login');
    await fillLogin('ada@example.test');
    expect(await screen.findByText('email must be an email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('a signed-in visitor is sent on from the login page', async () => {
    server.resetHandlers(); // refresh succeeds
    const { router } = renderRoute('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}`));
  });
});

describe('RegisterPage (Part 02)', () => {
  beforeEach(signedOut);

  async function fillRegister() {
    await userEvent.type(await screen.findByLabelText('Name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  }

  it('creates the account, signs in and lands in the new workspace (AC-02.1)', async () => {
    const { router } = renderRoute('/register');
    await fillRegister();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}`));
    expect(session.getState().status).toBe('authenticated');
  });

  it('enforces the backend password rule before submitting', async () => {
    let called = false;
    server.use(
      http.post(`${API}/auth/register`, () => {
        called = true;
        return HttpResponse.json(authResponse, { status: 201 });
      }),
    );
    renderRoute('/register');
    await userEvent.type(await screen.findByLabelText('Name'), 'Ada');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 12 characters')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('shows an existing email on the email field (409)', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        apiError(409, 'An account with this email already exists'),
      ),
    );
    renderRoute('/register');
    await fillRegister();
    expect(
      await screen.findByText(/An account with this email already exists/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in instead' })).toHaveAttribute('href', '/login');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

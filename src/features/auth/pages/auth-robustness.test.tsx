import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { authResponse } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const signedOut = () =>
  server.use(
    http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
  );

describe('robust sign-in and registration (Part 12)', () => {
  beforeEach(signedOut);

  it('shows and hides the password, and warns about Caps Lock', async () => {
    renderRoute('/login');
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.type(password, '{CapsLock}A');
    expect(screen.getByText('Caps Lock is on')).toBeInTheDocument();
  });

  it('has a way back to the homepage', async () => {
    renderRoute('/login');
    expect(await screen.findByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: 'FlowForge home' })[0]).toHaveAttribute('href', '/');
  });

  it('a network failure gets a clear message instead of raw text', async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.error()));
    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Check your connection/);
  });

  it('a server error shows the shared wording with the request id', async () => {
    server.use(http.post(`${API}/auth/login`, () => apiError(500, 'Internal server error')));
    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Something went wrong on our side.*request req-test-0001/,
    );
  });

  it('register: the checklist updates as you type, and the confirmation must match', async () => {
    let called = false;
    server.use(
      http.post(`${API}/auth/register`, () => {
        called = true;
        return HttpResponse.json(authResponse, { status: 201 });
      }),
    );
    renderRoute('/register');
    const password = await screen.findByLabelText('Password');
    const checks = screen.getByRole('list', { name: 'Password requirements' });
    expect(checks).toHaveTextContent('At least 12 characters(not met yet)');
    await userEvent.type(password, 'correct horse battery');
    expect(checks).toHaveTextContent('At least 12 characters(met)');
    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.test');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'correct horse batterx');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('The passwords do not match')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('register sends only the API fields, never the confirmation', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(authResponse, { status: 201 });
      }),
    );
    renderRoute('/register');
    await userEvent.type(await screen.findByLabelText('Name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email'), '  ada@example.test ');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.test',
      password: 'correct horse battery',
    });
  });
});

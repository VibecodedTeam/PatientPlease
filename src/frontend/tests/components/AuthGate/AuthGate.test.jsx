import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../src/providers/Api';
import { AuthProvider } from '../../../src/providers/Auth';
import { AuthGate } from '../../../components/AuthGate';

const USER = { id: '1', email: 'user@example.test', name: 'Test User', avatarUrl: null };

function renderGate(fetchImpl) {
  global.fetch = fetchImpl;
  return render(
    <ApiProvider baseUrl="http://api.test">
      <AuthProvider>
        <AuthGate googleClientId="test-client-id">
          <div>Protected content</div>
        </AuthGate>
      </AuthProvider>
    </ApiProvider>,
  );
}

describe('AuthGate', () => {
  beforeEach(() => {
    delete window.google;
  });

  it('shows a loading state before the session check resolves', () => {
    renderGate(() => new Promise(() => {}));

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows Login when unauthenticated', async () => {
    renderGate(() => Promise.resolve(new Response('{}', { status: 401 })));

    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows the header and children when authenticated', async () => {
    renderGate(() =>
      Promise.resolve(new Response(JSON.stringify({ user: USER }), { status: 200 })),
    );

    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('returns to Login after clicking Logout', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: USER }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <ApiProvider baseUrl="http://api.test">
        <AuthProvider>
          <AuthGate googleClientId="test-client-id">
            <div>Protected content</div>
          </AuthGate>
        </AuthProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
  });

  it('catches (does not leave unhandled) a rejected login when the backend rejects the Google credential', async () => {
    const initialize = jest.fn();
    window.google = { accounts: { id: { initialize, renderButton: jest.fn() } } };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_google_token' }), { status: 401 }),
      );

    render(
      <ApiProvider baseUrl="http://api.test">
        <AuthProvider>
          <AuthGate googleClientId="test-client-id">
            <div>Protected content</div>
          </AuthGate>
        </AuthProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());

    const { callback } = initialize.mock.calls[0][0];
    callback({ credential: 'expired-token' });

    // If AuthGate didn't attach a .catch() to login()'s promise, this
    // specific message would never be logged — jsdom would instead report
    // an uncaught "Unhandled promise rejection" exception, which surfaces as
    // a test failure (see src/frontend/jest.setup.js's virtual console) rather
    // than this assertion timing out quietly.
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Google sign-in failed', expect.anything()),
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});

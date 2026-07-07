import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider } from '../../../providers/Auth';
import { AuthGate } from '../../../components/AuthGate';

const USER = { id: '1', email: 'user@example.test', name: 'Test User', avatarUrl: null };

function renderGate(fetchImpl) {
  global.fetch = fetchImpl;
  return render(
    <ApiProvider>
      <AuthProvider>
        <AuthGate googleClientId="test-client-id">
          <div>Protected content</div>
        </AuthGate>
      </AuthProvider>
    </ApiProvider>,
  );
}

describe('AuthGate', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows a loading state before the session check resolves', () => {
    renderGate(() => new Promise(() => {}));

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows Login when unauthenticated', async () => {
    renderGate(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    );

    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows the header and children when authenticated', async () => {
    renderGate(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ user: USER }) }),
    );

    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('returns to Login after clicking Logout', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ user: USER }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.reject(new Error()) });

    render(
      <ApiProvider>
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
});

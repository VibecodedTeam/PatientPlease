import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider, useAuth } from '../../../providers/Auth';

const USER = { id: '1', email: 'user@example.test', name: 'Test User', avatarUrl: null };

function TestConsumer() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="user">{user ? user.name : 'none'}</div>
      <button type="button" onClick={() => login('id-token')}>
        Login
      </button>
      <button type="button" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

function BareConsumer() {
  useAuth();
  return null;
}

function renderWithProviders(ui) {
  return render(<ApiProvider>{ui}</ApiProvider>);
}

describe('AuthProvider / useAuth', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BareConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });

  it('starts loading, then becomes authenticated when /auth/me returns a user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: USER }),
    });

    renderWithProviders(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Test User');
  });

  it('becomes unauthenticated when /auth/me returns 401', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthenticated' }),
    });

    renderWithProviders(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('login() authenticates the user via POST /auth/google', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ user: USER }) });

    renderWithProviders(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/google'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('logout() clears the session via POST /auth/logout', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ user: USER }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.reject(new Error()) });

    renderWithProviders(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    await user.click(screen.getByText('Logout'));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

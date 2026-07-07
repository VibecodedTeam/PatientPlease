import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../src/providers/Api';
import { AuthProvider, useAuth } from '../../../../src/providers/Auth';

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
  return render(<ApiProvider baseUrl="http://api.test">{ui}</ApiProvider>);
}

describe('AuthProvider / useAuth', () => {
  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BareConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });

  it('starts loading, then becomes authenticated when /auth/me returns a user', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: USER }), { status: 200 }),
    );

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
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 }),
    );

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
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: USER }), { status: 200 }));

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
    const loginRequest = global.fetch.mock.calls[1][0];
    expect(new URL(loginRequest.url).pathname).toBe('/auth/google');
    expect(loginRequest.method).toBe('POST');
  });

  it('logout() clears the session via POST /auth/logout', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: USER }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

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
    const logoutRequest = global.fetch.mock.calls[1][0];
    expect(new URL(logoutRequest.url).pathname).toBe('/auth/logout');
    expect(logoutRequest.method).toBe('POST');
  });
});

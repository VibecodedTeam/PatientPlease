import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider } from '../../../providers/Auth';
import { StartView } from '../../../views/StartView';

function renderStartView() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <AuthProvider>
        <MemoryRouter>
          <StartView />
        </MemoryRouter>
      </AuthProvider>
    </ApiProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderStartViewWithRoutes() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<StartView />} />
            <Route path="/game/*" element={<div>Game area</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>
    </ApiProvider>,
  );
}

function mockAuthStatus(authenticated) {
  global.fetch = jest.fn().mockResolvedValue(
    authenticated
      ? new Response(JSON.stringify({ user: { id: '1', name: 'Test User' } }), { status: 200 })
      : new Response('', { status: 401 }),
  );
}

describe('StartView', () => {
  it('renders the Patient Please splash', async () => {
    mockAuthStatus(false);
    renderStartView();

    expect(screen.getByText('Now Admitting')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /patient.*please/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument());
  });

  it('surfaces Google sign-in when clicking PLAY while unauthenticated', async () => {
    const user = userEvent.setup();
    mockAuthStatus(false);
    renderStartView();

    await waitFor(() => screen.getByRole('button', { name: /play/i }));
    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does not surface Google sign-in when clicking PLAY while already authenticated', async () => {
    const user = userEvent.setup();
    mockAuthStatus(true);
    renderStartView();

    await waitFor(() => screen.getByRole('button', { name: /play/i }));
    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('navigates to /game when clicking PLAY while authenticated', async () => {
    const user = userEvent.setup();
    mockAuthStatus(true);
    renderStartViewWithRoutes();

    await waitFor(() => screen.getByRole('button', { name: /play/i }));
    await user.click(screen.getByRole('button', { name: /play/i }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/game'),
    );
    expect(screen.getByText('Game area')).toBeInTheDocument();
  });

  it('navigates to /game after a successful Google sign-in', async () => {
    const user = userEvent.setup();
    let capturedCallback;
    window.google = {
      accounts: {
        id: {
          initialize: ({ callback }) => {
            capturedCallback = callback;
          },
          renderButton: () => {},
        },
      },
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 })) // /auth/me
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: '1', name: 'Test User' } }), {
          status: 200,
        }),
      ); // /auth/google

    renderStartViewWithRoutes();

    await waitFor(() => screen.getByRole('button', { name: /play/i }));
    await user.click(screen.getByRole('button', { name: /play/i }));
    await waitFor(() => expect(capturedCallback).toBeDefined());

    capturedCallback({ credential: 'fake-google-jwt' });

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/game'),
    );
  });
});

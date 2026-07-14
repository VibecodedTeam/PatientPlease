import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider, useAuth } from '../../../providers/Auth';
import { RoundProvider } from '../../../providers/Round';
import { GameSessionProvider, useGameSession } from '../../../views/MainView/providers/GameSession';
import { Settings } from '../../../components/Settings';

const USER = { id: '1', email: 'user@example.test', name: 'Test User', avatarUrl: null };

function StatusReadout() {
  const { isPaused, elapsedSeconds } = useGameSession();
  return (
    <div>
      <span data-testid="isPaused">{String(isPaused)}</span>
      <span data-testid="elapsed">{elapsedSeconds}</span>
    </div>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

// Mirrors AuthGate's real contract: Settings only ever mounts once auth has
// resolved to a signed-in user, so this test renders it the same way rather
// than asserting on the impossible-in-production momentary null-user render.
function AuthenticatedGate({ children }) {
  const { status } = useAuth();
  if (status !== 'authenticated') return null;
  return children;
}

function authenticatedResponse() {
  return new Response(JSON.stringify({ user: USER }), { status: 200 });
}

// Route-aware (not queue-position-based): RoundProvider's own mount-time
// POST /api/v1/round call now competes with /auth/me for "which call goes
// first," and a position-based queue would risk handing the one queued
// authenticated response to the wrong call. /auth/me always gets it here
// regardless of call order; every other path gets a harmless 200 {}.
function mockFetchRoutes(overrides = {}) {
  const routes = { '/auth/me': authenticatedResponse, ...overrides };
  global.fetch = jest.fn((request) => {
    const pathname = new URL(request.url).pathname;
    const handler = routes[pathname];
    return Promise.resolve(handler ? handler() : new Response('{}', { status: 200 }));
  });
}

function findRequestByPath(pathname) {
  const call = global.fetch.mock.calls.find(([request]) => new URL(request.url).pathname === pathname);
  return call ? call[0] : undefined;
}

function renderSettings({ onClose = jest.fn(), autoPaused = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/game/main']}>
      <ApiProvider baseUrl="http://api.test">
        <AuthProvider>
          <RoundProvider>
            <GameSessionProvider>
              <AuthenticatedGate>
                <StatusReadout />
                <Settings onClose={onClose} autoPaused={autoPaused} />
              </AuthenticatedGate>
            </GameSessionProvider>
          </RoundProvider>
        </AuthProvider>
      </ApiProvider>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('pauses the game session on mount and shows the logged-in user', async () => {
    mockFetchRoutes();
    renderSettings();

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    expect(screen.getByTestId('isPaused')).toHaveTextContent('true');
    await waitFor(() => expect(findRequestByPath('/api/v1/game/pause')).toBeDefined());
    expect(findRequestByPath('/api/v1/game/pause').method).toBe('POST');
  });

  it('shows the auto-paused notice only when autoPaused is true', async () => {
    mockFetchRoutes();
    renderSettings({ autoPaused: true });

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    expect(screen.getByText('Game paused because you left the tab.')).toBeInTheDocument();
  });

  it('calls onClose and resumes the session when Resume is clicked', async () => {
    mockFetchRoutes();
    const onClose = jest.fn();
    renderSettings({ onClose });

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Resume'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls the real logout() when Log out is clicked', async () => {
    const user = userEvent.setup();
    mockFetchRoutes();
    renderSettings();

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    await user.click(screen.getByText('Log out'));

    await waitFor(() => expect(findRequestByPath('/auth/logout')).toBeDefined());
    expect(findRequestByPath('/auth/logout').method).toBe('POST');
  });

  it('navigates back to / after Log out is clicked', async () => {
    const user = userEvent.setup();
    mockFetchRoutes();
    renderSettings();

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveTextContent('/game/main');

    await user.click(screen.getByText('Log out'));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
  });

  it('confirming "Back to start of day" resets the day and closes Settings', async () => {
    const user = userEvent.setup();
    mockFetchRoutes();
    const onClose = jest.fn();
    renderSettings({ onClose });

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    await user.click(screen.getByText('Back to start of day'));
    expect(
      screen.getByText('Return to the start of the day? Your progress today will be lost.'),
    ).toBeInTheDocument();

    await user.click(screen.getByText('Confirm'));

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(findRequestByPath('/api/v1/day/reset')).toBeDefined());
    expect(findRequestByPath('/api/v1/day/reset').method).toBe('POST');
  });

  it('confirming "Back to start of game" resets the game and closes Settings', async () => {
    const user = userEvent.setup();
    mockFetchRoutes();
    const onClose = jest.fn();
    renderSettings({ onClose });

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    await user.click(screen.getByText('Back to start of game'));
    expect(
      screen.getByText('Return to the start of the game? All progress will be lost.'),
    ).toBeInTheDocument();

    await user.click(screen.getByText('Confirm'));

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(findRequestByPath('/api/v1/game/reset')).toBeDefined());
    expect(findRequestByPath('/api/v1/game/reset').method).toBe('POST');
  });

  it('cancelling a reset confirmation keeps Settings open without resetting', async () => {
    const user = userEvent.setup();
    mockFetchRoutes();
    const onClose = jest.fn();
    renderSettings({ onClose });

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    await user.click(screen.getByText('Back to start of game'));
    await user.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Return to the start of the game? All progress will be lost.')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('toggles the music setting locally', async () => {
    mockFetchRoutes();
    renderSettings();

    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    const toggle = screen.getByLabelText('Toggle music');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});

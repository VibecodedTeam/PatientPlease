import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider, useAuth } from '../../../providers/Auth';
import { MainView } from '../../../views/MainView';

const USER = { id: '1', email: 'user@example.test', name: 'Test User', avatarUrl: null };

const DEFAULT_ROUTES = {
  '/src/data/round_data.json': () =>
    new Response(JSON.stringify({ case: { documents: [] } }), { status: 200 }),
  '/auth/me': () => new Response(JSON.stringify({ user: USER }), { status: 200 }),
};

function mockFetchRoutes(overrides = {}) {
  const routes = { ...DEFAULT_ROUTES, ...overrides };
  global.fetch = jest.fn((request) => {
    const pathname = new URL(request.url).pathname;
    const handler = routes[pathname];
    return Promise.resolve(handler ? handler() : new Response('{}', { status: 200 }));
  });
}

// Mirrors AuthGate's real contract: MainView (and Settings within it) only
// ever mounts once auth has resolved to a signed-in user.
function AuthenticatedGate({ children }) {
  const { status } = useAuth();
  if (status !== 'authenticated') return null;
  return children;
}

async function renderMainView() {
  const result = render(
    <ApiProvider baseUrl="http://api.test">
      <AuthProvider>
        <AuthenticatedGate>
          <MainView />
        </AuthenticatedGate>
      </AuthProvider>
    </ApiProvider>,
  );
  await waitFor(() => expect(screen.getByText('Status: Running')).toBeInTheDocument());
  return result;
}

describe('MainView', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
    mockFetchRoutes();
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('renders the wall with the pinned board', async () => {
    await renderMainView();
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
    expect(screen.getByText('Patients left today: 5')).toBeInTheDocument();
  });

  it('renders the patient documents desk', async () => {
    await renderMainView();

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });

  it('opens Settings (pausing the timer) and closes it via Resume', async () => {
    const user = userEvent.setup();
    await renderMainView();

    expect(screen.getByText('Status: Running')).toBeInTheDocument();

    await user.click(screen.getByText('Open Settings'));
    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());
    expect(screen.getByText('Status: Paused')).toBeInTheDocument();
    expect(screen.queryByText('Game paused because you left the tab.')).not.toBeInTheDocument();

    await user.click(screen.getByText('Resume'));
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
  });

  it('auto-pauses and opens Settings with a notice when the document becomes hidden', async () => {
    await renderMainView();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByText('Status: Paused')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
    expect(screen.getByText('Game paused because you left the tab.')).toBeInTheDocument();
  });

  it('does not send a duplicate pause request if the tab is hidden repeatedly while already paused', async () => {
    await renderMainView();

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
    const pauseCalls = global.fetch.mock.calls.filter(
      ([request]) => new URL(request.url).pathname === '/api/v1/game/pause',
    );
    expect(pauseCalls).toHaveLength(1);
  });

  it('closes Settings and calls onClose when a reset is confirmed from the HUD path', async () => {
    const user = userEvent.setup();
    await renderMainView();

    await user.click(screen.getByText('Open Settings'));
    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());

    await user.click(screen.getByText('Back to start of day'));
    await user.click(screen.getByText('Confirm'));

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
  });
});

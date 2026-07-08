import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider, useAuth } from '../../../providers/Auth';
import { MainView } from '../../../views/MainView';

// esbuild-jest mishandles JSX hoisting in files that also call jest.mock(),
// so renderMainView()'s render(...) call below uses React.createElement instead
// of a JSX literal. PatientScene/PatientSceneProvider are mocked because they
// drive a real Three.js WebGLRenderer, which has no context to attach to under
// jsdom — PatientScene's own test suite (tests/components/PatientScene/) is
// where that rendering is exercised; this suite only verifies MainView wires
// the provider with the right model url and mounts the scene.
jest.mock('../../../components/PatientScene', () => {
  const ReactLib = require('react');
  return {
    PatientScene: ({ documents }) =>
      ReactLib.createElement('div', {
        'data-testid': 'patient-scene-stub',
        'data-document-ids': (documents ?? []).map((document) => document.id).join(','),
      }),
    PatientSceneProvider: ({ url, children }) =>
      ReactLib.createElement(
        'div',
        { 'data-testid': 'patient-scene-provider-stub', 'data-url': url },
        children,
      ),
  };
});

const USER = { id: '1', email: 'user@example.test', name: 'Test User', avatarUrl: null };

const ROUND_DOCUMENTS = [
  {
    id: 'doc-1',
    attentionPointRegion: 'LEFT_ARM',
    type: 'SKIN_IMAGE',
    title: 'Left shoulder — day 1',
    documentDate: '2026-01-01T00:00:00.000Z',
    sortOrder: 1,
    imageUrl: 'https://cdn.example.com/skin/lesion_01.png',
    imageWidthPx: 1024,
    imageHeightPx: 768,
    imageAltText: 'Asymmetric brown lesion, ~8mm',
    content: null,
  },
  {
    id: 'doc-2',
    attentionPointRegion: null,
    type: 'UV_EXPOSURE_HISTORY',
    title: 'Sun exposure history',
    documentDate: null,
    sortOrder: 2,
    imageUrl: null,
    imageWidthPx: null,
    imageHeightPx: null,
    imageAltText: null,
    content: { sunbedUse: 'frequent', occupationalExposure: 'high' },
  },
];

const DEFAULT_ROUTES = {
  '/api/v1/round': () =>
    new Response(JSON.stringify({ case: { documents: ROUND_DOCUMENTS } }), { status: 200 }),
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
    React.createElement(
      ApiProvider,
      { baseUrl: 'http://api.test' },
      React.createElement(
        AuthProvider,
        null,
        React.createElement(AuthenticatedGate, null, React.createElement(MainView)),
      ),
    ),
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

  it('renders the 3D patient scene in the patient preview area, fed by the round data', async () => {
    await renderMainView();

    expect(screen.getByTestId('patient-scene-provider-stub')).toHaveAttribute(
      'data-url',
      '/3DModels/FinalBaseMesh.obj',
    );
    await waitFor(() =>
      expect(screen.getByTestId('patient-scene-stub')).toHaveAttribute(
        'data-document-ids',
        'doc-1,doc-2',
      ),
    );
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

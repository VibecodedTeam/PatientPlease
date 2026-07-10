import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// This file avoids JSX everywhere (uses React.createElement instead): esbuild-jest
// routes any file containing "mock(" through an extra babel pass that strips the
// `React` import binding before esbuild's later JSX pass re-inserts bare
// `React.createElement` calls, causing a "React is not defined" crash.
//
// jsdom has no real WebGL context, so PatientScene (which drives a real Three.js
// WebGLRenderer) is stubbed here — this suite only cares about the Wall/Table
// content MainView renders alongside it, not the 3D scene itself.
jest.mock('../../../components/PatientScene', () => ({
  PatientScene: () => require('react').createElement('div', { 'data-testid': 'patient-scene' }),
  PatientSceneProvider: ({ children }) => children,
}));

const { MainView } = require('../../../views/MainView');
const { ApiProvider } = require('../../../providers/Api');

function renderMainView() {
  return render(
    React.createElement(ApiProvider, { baseUrl: 'http://api.test' }, React.createElement(MainView)),
  );
}
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider, useAuth } from '../../../providers/Auth';
import { MainView } from '../../../views/MainView';
import { DAY_DURATION_SECONDS } from '../../../views/MainView/providers/GameSession';
import { PatientScene } from '../../../components/PatientScene';

// esbuild-jest mishandles JSX hoisting in files that also call jest.mock(),
// so renderMainView()'s render(...) call below uses React.createElement instead
// of a JSX literal. PatientScene/PatientSceneProvider are mocked because they
// drive a real Three.js WebGLRenderer, which has no context to attach to under
// jsdom — PatientScene's own test suite (tests/components/PatientScene/) is
// where that rendering is exercised; this suite only verifies MainView wires
// the provider with the right model url and mounts the scene.
// PatientScene is wrapped in jest.fn() (rather than a plain arrow function) so
// tests can inspect exactly what props MainView passed it, e.g. asserting a
// stable `documents` reference across re-renders.
jest.mock('../../../components/PatientScene', () => {
  const ReactLib = require('react');
  return {
    PatientScene: jest.fn(({ documents }) =>
      ReactLib.createElement('div', {
        'data-testid': 'patient-scene-stub',
        'data-document-ids': (documents ?? []).map((document) => document.id).join(','),
      }),
    ),
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
    new Response(
      JSON.stringify({ case: { documents: ROUND_DOCUMENTS, moneyReward: 50, moneyPenalty: 20 } }),
      { status: 200 },
    ),
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

function NightMarker() {
  return React.createElement('div', null, 'Night marker');
}

async function renderMainView() {
  const result = render(
    React.createElement(
      ApiProvider,
      { baseUrl: 'http://api.test' },
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          AuthenticatedGate,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: ['/'] },
            React.createElement(
              Routes,
              null,
              React.createElement(Route, { path: '/', element: React.createElement(MainView) }),
              React.createElement(Route, { path: '/night', element: React.createElement(NightMarker) }),
            ),
          ),
        ),
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
    PatientScene.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('renders the wall with the pinned board', () => {
    renderMainView();
  it('renders the wall with the pinned board', async () => {
    await renderMainView();
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
    expect(screen.getByText('Patients left today: 5')).toBeInTheDocument();
  });

  it('renders the patient documents desk', async () => {
    renderMainView();
    await renderMainView();

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });

  it('shows a completion message instead of the desk when the game is finished', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'game_completed' }), { status: 409 }));

    renderMainView();

    await waitFor(() => expect(screen.getByText(/completed every case/i)).toBeInTheDocument());
    expect(screen.queryByText('Patient Information')).not.toBeInTheDocument();
  });

  it('shows a game-over message when the session is over', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'game_over' }), { status: 409 }));

    renderMainView();

    await waitFor(() => expect(screen.getByText(/game over/i)).toBeInTheDocument());
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

  it('passes PatientScene a stable documents reference across re-renders while round is still loading', async () => {
    let resolveRound;
    const roundPromise = new Promise((resolve) => {
      resolveRound = resolve;
    });
    mockFetchRoutes({ '/api/v1/round': () => roundPromise });
    const user = userEvent.setup();

    await renderMainView();
    const firstDocuments = PatientScene.mock.calls[0][0].documents;

    // Triggers a re-render (opening Settings) while the round fetch is still
    // unresolved, so `round` is still null and the `documents` fallback is
    // still in play.
    await user.click(screen.getByText('Open Settings'));
    const lastCall = PatientScene.mock.calls[PatientScene.mock.calls.length - 1];

    expect(lastCall[0].documents).toBe(firstDocuments);

    resolveRound(new Response(JSON.stringify({ case: { documents: ROUND_DOCUMENTS } }), { status: 200 }));
    await waitFor(() =>
      expect(screen.getByTestId('patient-scene-stub')).toHaveAttribute(
        'data-document-ids',
        'doc-1,doc-2',
      ),
    );
  });

  it('shows the ResultPopup with the real money reward after submitting a correct diagnosis', async () => {
    const user = userEvent.setup();
    await renderMainView();

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: 'Skin Cancer' }));
    await user.click(screen.getByText('Submit Diagnosis'));

    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText('+$50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument();
  });

  it('shows the ResultPopup with the real money penalty after submitting an incorrect diagnosis', async () => {
    const user = userEvent.setup();
    await renderMainView();

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: 'No Skin Condition' }));
    await user.click(screen.getByText('Submit Diagnosis'));

    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText('-$20')).toBeInTheDocument();
  });

  it('shows the Daily Statistics popup once the day timer elapses, and navigates to /night on close', async () => {
    mockFetchRoutes({
      '/api/v1/day/end': () =>
        new Response(
          JSON.stringify({
            gameSession: { consecutiveBadDiagnosisCount: 0 },
            dayLog: { dayNumber: 1, startingMoney: 100, endingMoney: 130, casesAttempted: 2, casesCorrect: 2 },
          }),
          { status: 200 },
        ),
    });
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    try {
      await renderMainView();

      await act(async () => {
        jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
      });

      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Daily Statistics' })).toBeInTheDocument(),
      );
      expect(screen.getByText('$130')).toBeInTheDocument();

      await act(async () => {
        screen.getByRole('button', { name: /continue/i }).click();
      });

      expect(screen.getByText('Night marker')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('defers the Daily Statistics popup until an open ResultPopup is closed', async () => {
    mockFetchRoutes({
      '/api/v1/day/end': () =>
        new Response(
          JSON.stringify({
            gameSession: { consecutiveBadDiagnosisCount: 0 },
            dayLog: { dayNumber: 1, startingMoney: 100, endingMoney: 130, casesAttempted: 2, casesCorrect: 2 },
          }),
          { status: 200 },
        ),
    });
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    try {
      await renderMainView();
      await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());

      await act(async () => {
        screen.getByRole('radio', { name: 'Skin Cancer' }).click();
      });
      await act(async () => {
        screen.getByText('Submit Diagnosis').click();
      });
      expect(screen.getByText('Correct!')).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
      });

      // The day-end call has already resolved in the background, but the
      // popup itself must stay hidden while the player hasn't yet
      // acknowledged their diagnosis result.
      expect(screen.queryByRole('heading', { name: 'Daily Statistics' })).not.toBeInTheDocument();
      expect(screen.getByText('Correct!')).toBeInTheDocument();

      await act(async () => {
        screen.getByRole('button', { name: /continue/i }).click();
      });

      expect(screen.queryByText('Correct!')).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Daily Statistics' })).toBeInTheDocument(),
      );
    } finally {
      jest.useRealTimers();
    }
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

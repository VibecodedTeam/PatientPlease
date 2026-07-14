import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider, useAuth } from '../../../providers/Auth';
import { RoundProvider } from '../../../providers/Round';
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
      JSON.stringify({
        case: {
          id: 'case-uuid',
          documents: ROUND_DOCUMENTS,
          moneyReward: 50,
          moneyPenalty: 20,
        },
      }),
      { status: 200 },
    ),
  '/api/v1/diagnoses': async (request) => {
    const body = await request.clone().json();
    const isCorrect = body.selectedDiagnosisId === 'skin-cancer';
    return new Response(
      JSON.stringify({
        gameSession: {},
        result: {
          isDiagnosisCorrect: isCorrect,
          isTreatmentCorrect: null,
          moneyDelta: isCorrect ? 50 : -20,
        },
      }),
      { status: 200 },
    );
  },
  '/auth/me': () => new Response(JSON.stringify({ user: USER }), { status: 200 }),
};

function mockFetchRoutes(overrides = {}) {
  const routes = { ...DEFAULT_ROUTES, ...overrides };
  global.fetch = jest.fn((request) => {
    const pathname = new URL(request.url).pathname;
    const handler = routes[pathname];
    return Promise.resolve(handler ? handler(request) : new Response('{}', { status: 200 }));
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
            RoundProvider,
            null,
            React.createElement(
              MemoryRouter,
              { initialEntries: ['/'] },
              React.createElement(
                Routes,
                null,
                React.createElement(Route, { path: '/', element: React.createElement(MainView) }),
                React.createElement(Route, { path: '/game/night', element: React.createElement(NightMarker) }),
              ),
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

  it('renders the wall', async () => {
    await renderMainView();
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
  });

  it('renders the patient documents desk', async () => {
    await renderMainView();

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });

  it('shows a completion message instead of the desk when the game is finished', async () => {
    mockFetchRoutes({
      '/api/v1/round': () =>
        new Response(JSON.stringify({ error: 'game_completed' }), { status: 409 }),
    });

    renderMainView();

    await waitFor(() => expect(screen.getByText(/completed every case/i)).toBeInTheDocument());
    expect(screen.queryByText('Patient Information')).not.toBeInTheDocument();
  });

  it('shows a game-over message when the session is over', async () => {
    mockFetchRoutes({
      '/api/v1/round': () => new Response(JSON.stringify({ error: 'game_over' }), { status: 409 }),
    });

    renderMainView();

    await waitFor(() => expect(screen.getByText(/game over/i)).toBeInTheDocument());
  });

  it('allows resetting the game from the completion screen, so a finished session is not a dead end', async () => {
    let hasReset = false;
    mockFetchRoutes({
      '/api/v1/round': () => {
        if (!hasReset) {
          return new Response(JSON.stringify({ error: 'game_completed' }), { status: 409 });
        }
        return DEFAULT_ROUTES['/api/v1/round']();
      },
      '/api/v1/game/reset': () => {
        hasReset = true;
        return new Response(JSON.stringify({ gameSession: {} }), { status: 200 });
      },
    });
    const user = userEvent.setup();

    renderMainView();
    await waitFor(() => expect(screen.getByText(/completed every case/i)).toBeInTheDocument());

    await user.click(screen.getByText('Open Settings'));
    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());

    await user.click(screen.getByText('Back to start of game'));
    await user.click(screen.getByText('Confirm'));

    await waitFor(() =>
      expect(screen.queryByText(/completed every case/i)).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    const resetCalls = global.fetch.mock.calls.filter(
      ([request]) => new URL(request.url).pathname === '/api/v1/game/reset',
    );
    expect(resetCalls).toHaveLength(1);
  });

  it('refetches the round every time MainView mounts, so returning from night shows the new case', async () => {
    let roundCallCount = 0;
    // Two calls happen on the very first mount: RoundProvider's own
    // one-time mount effect, plus MainView's own mount-effect refresh
    // (which is what this test exists to cover) - both fire together only
    // on this first render, since RoundProvider never mounts again after
    // this. Both are idempotent-while-open per docs/api/round.md, so they
    // return the same "yesterday" case; only the THIRD call (after the
    // toggle round-trip, simulating returning from /game/night) is the one
    // this test actually asserts on.
    let roundCaseId = 'case-yesterday';
    mockFetchRoutes({
      '/api/v1/round': () => {
        roundCallCount += 1;
        return new Response(
          JSON.stringify({ case: { documents: [], id: roundCaseId, moneyReward: 50, moneyPenalty: 20 } }),
          { status: 200 },
        );
      },
    });

    // Models the real bug exactly: RoundProvider is an ANCESTOR (mounted
    // once, per AppRoutes.jsx) that must stay mounted the whole time, while
    // MainView itself unmounts and remounts underneath it - reproducing
    // "navigate away to /game/night and back" without needing the
    // still-unbuilt NightView navigation button (Task 2, deferred).
    function Harness() {
      const [showMainView, setShowMainView] = React.useState(true);
      return React.createElement(
        React.Fragment,
        null,
        showMainView ? React.createElement(MainView) : React.createElement('div', null, 'elsewhere'),
        React.createElement(
          'button',
          { onClick: () => setShowMainView((current) => !current) },
          'toggle',
        ),
      );
    }

    render(
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
              RoundProvider,
              null,
              React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(Harness)),
            ),
          ),
        ),
      ),
    );
    await waitFor(() => expect(screen.getByText('Status: Running')).toBeInTheDocument());
    await waitFor(() => expect(roundCallCount).toBe(2));

    roundCaseId = 'case-today'; // models a new day/case becoming available while away
    const user = userEvent.setup();
    await user.click(screen.getByText('toggle')); // unmount MainView (simulates navigating to /game/night)
    await waitFor(() => expect(screen.getByText('elsewhere')).toBeInTheDocument());
    await user.click(screen.getByText('toggle')); // remount MainView (simulates returning to /game/main)

    await waitFor(() => expect(roundCallCount).toBe(3));
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

  it('toggles the patient area between the 3D scene and the chat panel', async () => {
    const user = userEvent.setup();
    await renderMainView();

    // Scene is shown by default; the chat panel is not mounted yet.
    expect(screen.getByTestId('patient-scene-provider-stub')).toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: /patient chat panel/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^chat$/i }));
    expect(
      screen.getByRole('complementary', { name: /patient chat panel/i }),
    ).toBeInTheDocument();
    // Scene stays mounted underneath (kept alive to avoid re-running Three.js setup).
    expect(screen.getByTestId('patient-scene-provider-stub')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /3d view/i }));
    expect(
      screen.queryByRole('complementary', { name: /patient chat panel/i }),
    ).not.toBeInTheDocument();
  });

  it('passes PatientScene a stable documents reference across re-renders while round is still loading', async () => {
    // MainView's own mount-effect refresh (in addition to RoundProvider's
    // own one-time mount fetch) means two /api/v1/round calls can be in
    // flight on the very first render — each needs its OWN Response
    // instance once "resolved" (a Response body can only be read once), so
    // this gate returns a fresh Response per pending call rather than
    // resolving one shared Promise/Response for both.
    let isResolved = false;
    const pendingCalls = [];
    mockFetchRoutes({
      '/api/v1/round': () =>
        new Promise((resolve) => {
          if (isResolved) {
            resolve(new Response(JSON.stringify({ case: { documents: ROUND_DOCUMENTS } }), { status: 200 }));
          } else {
            pendingCalls.push(resolve);
          }
        }),
    });
    const user = userEvent.setup();

    await renderMainView();
    const firstDocuments = PatientScene.mock.calls[0][0].documents;

    // Triggers a re-render (opening Settings) while the round fetch is still
    // unresolved, so `round` is still null and the `documents` fallback is
    // still in play.
    await user.click(screen.getByText('Open Settings'));
    const lastCall = PatientScene.mock.calls[PatientScene.mock.calls.length - 1];

    expect(lastCall[0].documents).toBe(firstDocuments);

    isResolved = true;
    pendingCalls.forEach((resolve) =>
      resolve(new Response(JSON.stringify({ case: { documents: ROUND_DOCUMENTS } }), { status: 200 })),
    );
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

  it('shows the Daily Statistics popup once the day timer elapses, and navigates to /game/night on close', async () => {
    mockFetchRoutes({
      '/api/v1/day/end': () =>
        new Response(
          JSON.stringify({
            gameSession: { consecutiveBadDiagnosisCount: 0 },
            dayLog: {
              dayNumber: 1,
              startingMoney: 100,
              endingMoney: 130,
              casesAttempted: 2,
              casesCorrect: 2,
              elapsedMs: 65000,
            },
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
            dayLog: {
              dayNumber: 1,
              startingMoney: 100,
              endingMoney: 130,
              casesAttempted: 2,
              casesCorrect: 2,
              elapsedMs: 65000,
            },
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

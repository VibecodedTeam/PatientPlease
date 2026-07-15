import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider, useRound } from '../../../../../providers/Round';
import {
  GameSessionProvider,
  useGameSession,
  DAY_DURATION_SECONDS,
} from '../../../../../views/MainView/providers/GameSession';
import { resolveDayDurationSeconds } from '../../../../../views/MainView/providers/GameSession/GameSessionProvider';

function TestConsumer() {
  const {
    elapsedSeconds,
    isPaused,
    isDayOver,
    pauseTimer,
    resumeTimer,
    resetDay,
    resetGame,
    endDay,
    addElapsedSeconds,
  } = useGameSession();
  const [dayLog, setDayLog] = React.useState(null);
  return (
    <div>
      <span data-testid="elapsed">{elapsedSeconds}</span>
      <span data-testid="paused">{String(isPaused)}</span>
      <span data-testid="day-over">{String(isDayOver)}</span>
      <span data-testid="day-log">{dayLog ? JSON.stringify(dayLog) : 'none'}</span>
      <button onClick={pauseTimer}>pause</button>
      <button onClick={resumeTimer}>resume</button>
      <button onClick={resetDay}>reset-day</button>
      <button onClick={resetGame}>reset-game</button>
      <button onClick={() => endDay().then((data) => setDayLog(data.dayLog))}>end-day</button>
      <button onClick={() => addElapsedSeconds(5)}>add-5</button>
      <button onClick={() => addElapsedSeconds(DAY_DURATION_SECONDS)}>add-full-day</button>
    </div>
  );
}

// Consumer that also exposes RoundProvider's refreshRound(), so tests can
// simulate a fresh round arriving (new day, or a same-day refetch) and assert
// how the timer re-seeds.
function DayKeyedConsumer() {
  const { elapsedSeconds, isPaused, isDayOver } = useGameSession();
  const { refreshRound } = useRound();
  return (
    <div>
      <span data-testid="elapsed">{elapsedSeconds}</span>
      <span data-testid="paused">{String(isPaused)}</span>
      <span data-testid="day-over">{String(isDayOver)}</span>
      <button onClick={() => refreshRound()}>refresh</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <TestConsumer />
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

function setDocumentHidden(value) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
}

function fireVisibilityChange() {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function lastRequest() {
  return global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
}

describe('resolveDayDurationSeconds', () => {
  it('returns the parsed value when VITE_DAY_DURATION_SECONDS is set', () => {
    expect(resolveDayDurationSeconds('30', 60)).toBe(30);
  });

  it('falls back to the default when VITE_DAY_DURATION_SECONDS is unset', () => {
    expect(resolveDayDurationSeconds(undefined, 60)).toBe(60);
  });

  it('falls back to the default when VITE_DAY_DURATION_SECONDS is an empty string', () => {
    expect(resolveDayDurationSeconds('', 60)).toBe(60);
  });

  it('falls back to the default when VITE_DAY_DURATION_SECONDS is non-numeric', () => {
    expect(resolveDayDurationSeconds('abc', 60)).toBe(60);
  });

  it('falls back to the default when VITE_DAY_DURATION_SECONDS is "0"', () => {
    expect(resolveDayDurationSeconds('0', 60)).toBe(60);
  });

  it('falls back to the default when VITE_DAY_DURATION_SECONDS is negative', () => {
    expect(resolveDayDurationSeconds('-1', 60)).toBe(60);
  });
});

describe('GameSessionProvider / useGameSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    jest.useRealTimers();
    setDocumentHidden(false);
  });

  it('seeds elapsedSeconds from round.dayLog.elapsedMs on load, so a page refresh does not restart the timer at zero', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ dayLog: { elapsedMs: 15000 } }), { status: 200 }),
      );

    renderWithProviders();

    await waitFor(() => expect(screen.getByTestId('elapsed').textContent).toBe('15'));
  });

  it('keeps ticking up from the server-seeded value and does not re-sync once round updates again later', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (String(url).includes('/api/v1/round')) {
        return Promise.resolve(
          new Response(JSON.stringify({ dayLog: { elapsedMs: 15000 } }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('elapsed').textContent).toBe('15'));

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('18');

    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(screen.getByTestId('paused').textContent).toBe('true'));

    expect(screen.getByTestId('elapsed').textContent).toBe('18');
  });

  it('clamps elapsedSeconds seeded from round.dayLog.elapsedMs to DAY_DURATION_SECONDS, so a refresh while examining the last case does not show a growing time past the limit', async () => {
    // The backend's real clock keeps running past the frontend's day-over
    // freeze (it must, so the player can still submit the last diagnosis —
    // see services/diagnosis.ts/examination.ts requiring an ACTIVE session,
    // which pausing server-side would break). A refresh here must display
    // the frozen limit, not the ever-growing real elapsed time.
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ dayLog: { elapsedMs: 95000 } }), { status: 200 }),
      );

    renderWithProviders();

    await waitFor(() =>
      expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS)),
    );
    expect(screen.getByTestId('day-over').textContent).toBe('true');
    expect(screen.getByTestId('paused').textContent).toBe('true');

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
  });

  it('counts elapsed seconds upward while not paused', () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('3');
  });

  it('stops counting and POSTs /api/v1/game/pause when paused', async () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    act(() => {
      screen.getByText('pause').click();
    });

    expect(screen.getByTestId('paused').textContent).toBe('true');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/game/pause');

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('2');
  });

  it('does not throw when the pause request fails (no active game yet, or unauthenticated)', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 409 }));
    renderWithProviders();

    act(() => {
      screen.getByText('pause').click();
    });

    expect(screen.getByTestId('paused').textContent).toBe('true');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it('resumes counting locally and POSTs /api/v1/game/resume when resumeTimer is called', async () => {
    renderWithProviders();
    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    act(() => {
      screen.getByText('resume').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/game/resume');

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('4');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('does not call the resume endpoint when resumeTimer is called while not paused', () => {
    renderWithProviders();

    act(() => {
      screen.getByText('resume').click();
    });

    // Just the RoundProvider's own mount-time POST /api/v1/round call.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('resetDay zeroes the elapsed timer and POSTs /api/v1/day/reset', async () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      screen.getByText('reset-day').click();
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('0');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/day/reset');
  });

  it('resetGame zeroes the elapsed timer and POSTs /api/v1/game/reset', async () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      screen.getByText('reset-game').click();
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('0');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/game/reset');
  });

  it('auto-pauses and calls the pause endpoint when the document becomes hidden', async () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    setDocumentHidden(true);
    fireVisibilityChange();

    expect(screen.getByTestId('paused').textContent).toBe('true');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('2');
  });

  it('does not send a duplicate pause request if the tab is hidden more than once while already paused', () => {
    renderWithProviders();

    setDocumentHidden(true);
    fireVisibilityChange();
    fireVisibilityChange();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not send a duplicate pause request when auto-paused after an explicit pauseTimer call', async () => {
    renderWithProviders();

    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    setDocumentHidden(true);
    fireVisibilityChange();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('flips isDayOver and freezes the timer once elapsedSeconds reaches DAY_DURATION_SECONDS', () => {
    renderWithProviders();

    act(() => {
      jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
    });

    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
    expect(screen.getByTestId('day-over').textContent).toBe('true');
    expect(screen.getByTestId('paused').textContent).toBe('true');

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
  });

  it('resumeTimer does not un-pause a day that is already over', () => {
    renderWithProviders();

    act(() => {
      jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
    });
    expect(screen.getByTestId('paused').textContent).toBe('true');

    act(() => {
      screen.getByText('resume').click();
    });

    expect(screen.getByTestId('paused').textContent).toBe('true');
    // The day-over freeze never called the pause endpoint (see the elapsedSeconds
    // seeding test above), so resumeTimer's no-op here must not call resume either.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
  });

  it('endDay POSTs /api/v1/day/end, returns the real payload, and resets elapsedSeconds', async () => {
    const dayLogResponse = {
      gameSession: { consecutiveBadDiagnosisCount: 0 },
      dayLog: { id: 'day-1', dayNumber: 3, startingMoney: 100, endingMoney: 130, casesAttempted: 2, casesCorrect: 2 },
    };
    // mockImplementation (not mockResolvedValue) so each call gets its own
    // Response instance — RoundProvider's own mount-time round-start call
    // now shares this mock too, and a Response body can only be read once.
    global.fetch = jest
      .fn()
      .mockImplementation(() => new Response(JSON.stringify(dayLogResponse), { status: 200 }));
    renderWithProviders();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await act(async () => {
      screen.getByText('end-day').click();
    });

    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/day/end');
    await waitFor(() =>
      expect(screen.getByTestId('day-log').textContent).toBe(JSON.stringify(dayLogResponse.dayLog)),
    );
    expect(screen.getByTestId('elapsed').textContent).toBe('0');
  });

  it('addElapsedSeconds increases elapsedSeconds by the given amount', () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => {
      screen.getByText('add-5').click();
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('8');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('addElapsedSeconds freezes the timer once the total reaches DAY_DURATION_SECONDS', () => {
    renderWithProviders();

    act(() => {
      screen.getByText('add-full-day').click();
    });

    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
    expect(screen.getByTestId('paused').textContent).toBe('true');

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
  });

  it('re-seeds the timer to 0 when a new day (higher dayNumber) arrives, so returning from night does not stay frozen at the previous day\'s full duration', async () => {
    let roundCall = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (String(url).includes('/api/v1/round')) {
        roundCall += 1;
        const body =
          roundCall === 1
            ? { dayLog: { elapsedMs: 60000, dayNumber: 1 } }
            : { dayLog: { elapsedMs: 0, dayNumber: 2 } };
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <GameSessionProvider>
            <DayKeyedConsumer />
          </GameSessionProvider>
        </RoundProvider>
      </ApiProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS)),
    );
    expect(screen.getByTestId('day-over').textContent).toBe('true');

    act(() => {
      screen.getByText('refresh').click();
    });

    await waitFor(() => expect(screen.getByTestId('elapsed').textContent).toBe('0'));
    expect(screen.getByTestId('day-over').textContent).toBe('false');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('does not re-seed (clobber local ticking) when round updates with the same dayNumber', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (String(url).includes('/api/v1/round')) {
        return Promise.resolve(
          new Response(JSON.stringify({ dayLog: { elapsedMs: 10000, dayNumber: 1 } }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <GameSessionProvider>
            <DayKeyedConsumer />
          </GameSessionProvider>
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('elapsed').textContent).toBe('10'));

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('13');

    act(() => {
      screen.getByText('refresh').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // Same dayNumber => the fresh round must not reset the timer back to 10.
    expect(screen.getByTestId('elapsed').textContent).toBe('13');
  });

  it('releases a backend pause it initiated even after the day is over, so the final case stays submittable', async () => {
    renderWithProviders();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(lastRequest().url).toBe('http://api.test/api/v1/game/pause');

    // Force the day over while a backend pause we initiated is still
    // outstanding (a boundary the timer/examination flow can reach).
    act(() => {
      screen.getByText('add-full-day').click();
    });
    expect(screen.getByTestId('day-over').textContent).toBe('true');
    expect(screen.getByTestId('paused').textContent).toBe('true');

    act(() => {
      screen.getByText('resume').click();
    });

    // Resume still fires so the backend session goes ACTIVE (submit/day-end work)...
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/game/resume');
    // ...but the local day-over freeze is preserved.
    expect(screen.getByTestId('paused').textContent).toBe('true');
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe(String(DAY_DURATION_SECONDS));
  });

  it('does not auto-resume when the document becomes visible again', () => {
    renderWithProviders();

    setDocumentHidden(true);
    fireVisibilityChange();
    expect(screen.getByTestId('paused').textContent).toBe('true');

    setDocumentHidden(false);
    fireVisibilityChange();

    expect(screen.getByTestId('paused').textContent).toBe('true');
  });
});

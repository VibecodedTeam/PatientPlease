import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import {
  GameSessionProvider,
  useGameSession,
  DAY_DURATION_SECONDS,
} from '../../../../../views/MainView/providers/GameSession';

function TestConsumer() {
  const { elapsedSeconds, isPaused, isDayOver, pauseTimer, resumeTimer, resetDay, resetGame, endDay } =
    useGameSession();
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

describe('GameSessionProvider / useGameSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    jest.useRealTimers();
    setDocumentHidden(false);
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

  it('resumes counting locally after resumeTimer is called, without calling the API', async () => {
    renderWithProviders();
    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    act(() => {
      screen.getByText('resume').click();
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('4');
    expect(screen.getByTestId('paused').textContent).toBe('false');
    expect(global.fetch).toHaveBeenCalledTimes(2);
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

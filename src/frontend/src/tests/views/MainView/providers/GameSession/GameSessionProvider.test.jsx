import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { GameSessionProvider, useGameSession } from '../../../../../views/MainView/providers/GameSession';

function TestConsumer() {
  const { elapsedSeconds, isPaused, pauseTimer, resumeTimer, resetDay, resetGame } = useGameSession();
  return (
    <div>
      <span data-testid="elapsed">{elapsedSeconds}</span>
      <span data-testid="paused">{String(isPaused)}</span>
      <button onClick={pauseTimer}>pause</button>
      <button onClick={resumeTimer}>resume</button>
      <button onClick={resetDay}>reset-day</button>
      <button onClick={resetGame}>reset-game</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <GameSessionProvider>
        <TestConsumer />
      </GameSessionProvider>
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('resumes counting locally after resumeTimer is called, without calling the API', async () => {
    renderWithProviders();
    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    act(() => {
      screen.getByText('resume').click();
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('4');
    expect(screen.getByTestId('paused').textContent).toBe('false');
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

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

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not send a duplicate pause request when auto-paused after an explicit pauseTimer call', async () => {
    renderWithProviders();

    act(() => {
      screen.getByText('pause').click();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    setDocumentHidden(true);
    fireVisibilityChange();

    expect(global.fetch).toHaveBeenCalledTimes(1);
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

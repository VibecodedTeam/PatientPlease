import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ApiProvider } from '../../../providers/Api';
import { GameSessionProvider, useGameSession } from '../../../providers/GameSession';

function TestConsumer() {
  const { elapsedSeconds, isPaused, pauseTimer, resumeTimer, resetTimer } = useGameSession();
  return (
    <div>
      <span data-testid="elapsed">{elapsedSeconds}</span>
      <span data-testid="paused">{String(isPaused)}</span>
      <button onClick={pauseTimer}>pause</button>
      <button onClick={resumeTimer}>resume</button>
      <button onClick={resetTimer}>reset</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <ApiProvider>
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

describe('GameSessionProvider / useGameSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ paused: true, pausedAt: '2024-01-01T00:00:00.000Z' }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
    setDocumentHidden(false);
  });

  it('counts elapsed seconds upward while not paused', () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('3');
  });

  it('stops counting and calls POST /api/v1/game/pause when paused', async () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await act(async () => {
      screen.getByText('pause').click();
    });

    expect(screen.getByTestId('paused').textContent).toBe('true');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/game/pause',
      expect.objectContaining({ method: 'POST' }),
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('2');
  });

  it('resumes counting after resumeTimer is called', async () => {
    renderWithProviders();
    await act(async () => {
      screen.getByText('pause').click();
    });
    act(() => {
      screen.getByText('resume').click();
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('4');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('resets elapsed seconds back to zero', () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    act(() => {
      screen.getByText('reset').click();
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('0');
  });

  it('auto-pauses and calls the pause endpoint when the document becomes hidden', () => {
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    setDocumentHidden(true);
    fireVisibilityChange();

    expect(screen.getByTestId('paused').textContent).toBe('true');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/game/pause',
      expect.objectContaining({ method: 'POST' }),
    );

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

    await act(async () => {
      screen.getByText('pause').click();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

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

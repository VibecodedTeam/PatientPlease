import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ApiProvider } from '../../../providers/Api';
import { GameSessionProvider, useGameSession } from '../../../providers/GameSession';
import { Settings } from '../../../components/Settings';

function StatusReadout() {
  const { isPaused, elapsedSeconds } = useGameSession();
  return (
    <div>
      <span data-testid="isPaused">{String(isPaused)}</span>
      <span data-testid="elapsed">{elapsedSeconds}</span>
    </div>
  );
}

function withoutSettings() {
  return (
    <ApiProvider>
      <GameSessionProvider>
        <StatusReadout />
      </GameSessionProvider>
    </ApiProvider>
  );
}

function withSettings(onClose, autoPaused) {
  return (
    <ApiProvider>
      <GameSessionProvider>
        <StatusReadout />
        <Settings onClose={onClose} autoPaused={autoPaused} />
      </GameSessionProvider>
    </ApiProvider>
  );
}

describe('Settings', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ paused: true, pausedAt: '2024-01-01T00:00:00.000Z' }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
  });

  it('pauses the timer once opened', () => {
    render(withSettings(() => {}));
    expect(screen.getByTestId('isPaused').textContent).toBe('true');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/game/pause',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('resumes the timer once it is closed (unmounted)', () => {
    const { rerender } = render(withSettings(() => {}));
    expect(screen.getByTestId('isPaused').textContent).toBe('true');

    rerender(withoutSettings());
    expect(screen.getByTestId('isPaused').textContent).toBe('false');
  });

  it('does not show the auto-pause notice by default', () => {
    render(withSettings(() => {}));
    expect(
      screen.queryByText('Game paused because you left the tab.'),
    ).not.toBeInTheDocument();
  });

  it('shows the auto-pause notice when autoPaused is true', () => {
    render(withSettings(() => {}, true));
    expect(screen.getByText('Game paused because you left the tab.')).toBeInTheDocument();
  });

  it('toggles the Music setting from On to Off and back, as local UI state only', () => {
    render(withSettings(() => {}));

    const musicToggle = screen.getByLabelText('Toggle music');
    expect(musicToggle).toHaveTextContent('On');

    fireEvent.click(musicToggle);
    expect(musicToggle).toHaveTextContent('Off');

    fireEvent.click(musicToggle);
    expect(musicToggle).toHaveTextContent('On');
  });

  it('shows a logged-out state by default, with a Log in button', () => {
    render(withSettings(() => {}));
    expect(screen.getByText('Logged out')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('logs in as Doctor when Log in is clicked, without calling fetch', () => {
    render(withSettings(() => {}));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Log in'));

    expect(screen.getByText('Logged in as Doctor')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('logs out back to the logged-out state when Log out is clicked, without calling fetch', () => {
    render(withSettings(() => {}));
    fireEvent.click(screen.getByText('Log in'));

    fireEvent.click(screen.getByText('Log out'));

    expect(screen.getByText('Logged out')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Resume is clicked, without any confirmation', () => {
    const onClose = jest.fn();
    render(withSettings(onClose));
    fireEvent.click(screen.getByText('Resume'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('back to start of day: requires confirmation, resets the timer and closes on confirm', () => {
    const onClose = jest.fn();
    const { rerender } = render(withoutSettings());
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('5');

    rerender(withSettings(onClose));

    fireEvent.click(screen.getByText('Back to start of day'));
    expect(screen.getByText(/return to the start of the day/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.getByTestId('elapsed').textContent).toBe('0');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('back to start of day: cancel dismisses without resetting or closing', () => {
    const onClose = jest.fn();
    const { rerender } = render(withoutSettings());
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    rerender(withSettings(onClose));

    fireEvent.click(screen.getByText('Back to start of day'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByTestId('elapsed').textContent).toBe('5');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('back to start of game: requires confirmation, resets the timer and closes on confirm', () => {
    const onClose = jest.fn();
    const { rerender } = render(withoutSettings());
    act(() => {
      jest.advanceTimersByTime(7000);
    });
    expect(screen.getByTestId('elapsed').textContent).toBe('7');

    rerender(withSettings(onClose));

    fireEvent.click(screen.getByText('Back to start of game'));
    expect(screen.getByText(/return to the start of the game/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.getByTestId('elapsed').textContent).toBe('0');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('back to start of game: cancel dismisses without resetting or closing', () => {
    const onClose = jest.fn();
    const { rerender } = render(withoutSettings());
    act(() => {
      jest.advanceTimersByTime(7000);
    });
    rerender(withSettings(onClose));

    fireEvent.click(screen.getByText('Back to start of game'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByTestId('elapsed').textContent).toBe('7');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

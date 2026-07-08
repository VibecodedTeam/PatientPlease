import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MainView } from '../../../views/MainView';

describe('MainView', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ paused: true, pausedAt: '2024-01-01T00:00:00.000Z' }),
    });
  });

  afterEach(() => {
    delete global.fetch;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('renders', () => {
    render(<MainView />);
    expect(screen.getByText('Main View')).toBeInTheDocument();
  });

  it('opens Settings (pausing the timer) and closes it via Resume', () => {
    render(<MainView />);

    expect(screen.getByText('Status: Running')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Open Settings'));
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Status: Paused')).toBeInTheDocument();
    expect(
      screen.queryByText('Game paused because you left the tab.'),
    ).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/game/pause',
      expect.objectContaining({ method: 'POST' }),
    );

    fireEvent.click(screen.getByText('Resume'));
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
  });

  it('auto-pauses, opens Settings with a notice when the document becomes hidden, and neither auto-resumes nor closes Settings when visible again', () => {
    render(<MainView />);
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('Status: Paused')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Game paused because you left the tab.')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('Status: Paused')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Resume'));
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
  });

  it('does not send a duplicate pause request if the tab is hidden repeatedly while already paused', () => {
    render(<MainView />);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

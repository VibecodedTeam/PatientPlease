import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { GameSessionProvider, DAY_DURATION_SECONDS } from '../../../../../views/MainView/providers/GameSession';
import { StatisticsProvider, useStatistics } from '../../../../../views/MainView/providers/Statistics';

const DAY_LOG_RESPONSE = {
  gameSession: { consecutiveBadDiagnosisCount: 0 },
  dayLog: {
    dayNumber: 3,
    startingMoney: 100,
    endingMoney: 130,
    casesAttempted: 2,
    casesCorrect: 2,
  },
};

function StatisticsConsumer() {
  const { isOpen, statistics, closeStatistics } = useStatistics();
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="statistics">{statistics ? JSON.stringify(statistics) : 'none'}</span>
      <button onClick={closeStatistics}>close</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <GameSessionProvider>
        <StatisticsProvider>
          <StatisticsConsumer />
        </StatisticsProvider>
      </GameSessionProvider>
    </ApiProvider>,
  );
}

describe('StatisticsProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(DAY_LOG_RESPONSE), { status: 200 }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts closed', () => {
    renderWithProviders();
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });

  it('calls endDay and opens with real dayLog data plus the placeholder money breakdown once the day timer elapses', async () => {
    renderWithProviders();

    await act(async () => {
      jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
    });

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    const statistics = JSON.parse(screen.getByTestId('statistics').textContent);
    expect(statistics).toEqual({
      dayNumber: 3,
      startingMoney: 100,
      endingMoney: 130,
      casesAttempted: 2,
      casesCorrect: 2,
      moneyMade: 30,
      moneyLost: 0,
    });

    const lastCallRequest = global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
    expect(lastCallRequest.method).toBe('POST');
    expect(lastCallRequest.url).toBe('http://api.test/api/v1/day/end');
  });

  it('logs the error and stays closed (no unhandled rejection) if endDay fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders();

    await act(async () => {
      jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
    });

    expect(screen.getByTestId('is-open').textContent).toBe('false');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('closeStatistics closes the popup', async () => {
    renderWithProviders();

    await act(async () => {
      jest.advanceTimersByTime(DAY_DURATION_SECONDS * 1000);
    });
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));

    act(() => {
      screen.getByText('close').click();
    });
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });
});

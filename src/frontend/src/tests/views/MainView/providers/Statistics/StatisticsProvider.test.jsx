import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { GameSessionProvider } from '../../../../../views/MainView/providers/GameSession';
import { StatisticsProvider, useStatistics } from '../../../../../views/MainView/providers/Statistics';

const DAY_LOG_RESPONSE = {
  gameSession: { consecutiveBadDiagnosisCount: 0 },
  dayLog: {
    dayNumber: 3,
    startingMoney: 100,
    endingMoney: 130,
    casesAttempted: 2,
    casesCorrect: 2,
    elapsedMs: 65000,
  },
};

function StatisticsConsumer() {
  const { isOpen, statistics, closeStatistics, finishDay, endDayError, retryFinishDay } =
    useStatistics();
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="statistics">{statistics ? JSON.stringify(statistics) : 'none'}</span>
      <span data-testid="end-day-error">{endDayError ? 'error' : 'none'}</span>
      <button onClick={closeStatistics}>close</button>
      <button onClick={finishDay}>finish-day</button>
      <button onClick={retryFinishDay}>retry</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <StatisticsProvider>
            <StatisticsConsumer />
          </StatisticsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('StatisticsProvider', () => {
  beforeEach(() => {
    // mockImplementation (not mockResolvedValue) so each call gets its own
    // Response instance — RoundProvider's own mount-time round-start call
    // now shares this mock too, and a Response body can only be read once.
    global.fetch = jest
      .fn()
      .mockImplementation(() => new Response(JSON.stringify(DAY_LOG_RESPONSE), { status: 200 }));
  });

  it('starts closed', () => {
    renderWithProviders();
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });

  // Deciding *when* the day should actually end (i.e. not mid-examination)
  // is ResultsProvider's job (see its closeResult) — this provider only
  // owns *how* to end it once asked, via the exposed finishDay action.
  it('finishDay calls the real day/end endpoint and opens with the real day statistics derived from dayLog', async () => {
    renderWithProviders();

    await act(async () => {
      screen.getByText('finish-day').click();
    });

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    const statistics = JSON.parse(screen.getByTestId('statistics').textContent);
    expect(statistics).toEqual({
      dayNumber: 3,
      casesAttempted: 2,
      casesCorrect: 2,
      moneyEarned: 30,
      endingMoney: 130,
      elapsedMs: 65000,
    });
    expect(statistics.moneyMade).toBeUndefined();
    expect(statistics.moneyLost).toBeUndefined();

    const lastCallRequest = global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
    expect(lastCallRequest.method).toBe('POST');
    expect(lastCallRequest.url).toBe('http://api.test/api/v1/day/end');
  });

  it('surfaces endDayError and stays closed (no unhandled rejection) if endDay fails', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => new Response('Internal Server Error', { status: 500 }));
    renderWithProviders();

    await act(async () => {
      screen.getByText('finish-day').click();
    });

    expect(screen.getByTestId('is-open').textContent).toBe('false');
    await waitFor(() => expect(screen.getByTestId('end-day-error').textContent).toBe('error'));
  });

  it('retryFinishDay re-attempts the day-end and, on success, clears the error and opens the popup', async () => {
    let shouldFail = true;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/day/end' && shouldFail) {
        return new Response('Internal Server Error', { status: 500 });
      }
      return new Response(JSON.stringify(DAY_LOG_RESPONSE), { status: 200 });
    });
    renderWithProviders();

    await act(async () => {
      screen.getByText('finish-day').click();
    });
    await waitFor(() => expect(screen.getByTestId('end-day-error').textContent).toBe('error'));
    expect(screen.getByTestId('is-open').textContent).toBe('false');

    shouldFail = false;
    await act(async () => {
      screen.getByText('retry').click();
    });

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    expect(screen.getByTestId('end-day-error').textContent).toBe('none');
  });

  it('closeStatistics closes the popup', async () => {
    renderWithProviders();

    await act(async () => {
      screen.getByText('finish-day').click();
    });
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));

    act(() => {
      screen.getByText('close').click();
    });
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });
});

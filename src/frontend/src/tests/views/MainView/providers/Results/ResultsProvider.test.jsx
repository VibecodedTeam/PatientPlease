import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import {
  GameSessionProvider,
  useGameSession,
  DAY_DURATION_SECONDS,
} from '../../../../../views/MainView/providers/GameSession';
import { StatisticsProvider } from '../../../../../views/MainView/providers/Statistics';
import { ResultsProvider, useResults } from '../../../../../views/MainView/providers/Results';

const ROUND_RESPONSE = {
  gameSession: { money: 100 },
  case: { id: 'case-uuid' },
};

function ResultsConsumer() {
  const { isOpen, result, error, showResult, closeResult } = useResults();
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="is-correct">{result ? String(result.isCorrect) : 'none'}</span>
      <span data-testid="money-delta">{result ? result.moneyDelta : 'none'}</span>
      <span data-testid="balance">{result ? result.balance : 'none'}</span>
      <span data-testid="examine-seconds">
        {result ? typeof result.examineSeconds : 'none'}
      </span>
      <span data-testid="has-error">{String(error !== null)}</span>
      <button onClick={() => showResult({ id: 'real-diagnosis-uuid', label: 'Melanoma' })}>
        submit-correct
      </button>
      <button
        onClick={() => showResult({ id: 'other-diagnosis-uuid', label: 'Seborrheic Keratosis' })}
      >
        submit-incorrect
      </button>
      <button onClick={closeResult}>close</button>
    </div>
  );
}

// Drives GameSession's day timer directly (rather than advancing real/fake
// timers) so a test can put the day "over" deterministically before
// exercising ResultsProvider's closeResult.
function GameSessionDriver() {
  const { addElapsedSeconds } = useGameSession();
  return (
    <button onClick={() => addElapsedSeconds(DAY_DURATION_SECONDS)}>end-day-timer</button>
  );
}

function mockFetch(diagnosesResponse) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/diagnoses') {
      return Promise.resolve(new Response(JSON.stringify(diagnosesResponse), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
  });
}

async function renderWithProviders() {
  const result = render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <StatisticsProvider>
            <ResultsProvider>
              <GameSessionDriver />
              <ResultsConsumer />
            </ResultsProvider>
          </StatisticsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('false'));
  return result;
}

describe('ResultsProvider', () => {
  it('starts closed with no result', async () => {
    global.fetch = mockFetch({});
    await renderWithProviders();
    expect(screen.getByTestId('is-open').textContent).toBe('false');
    expect(screen.getByTestId('is-correct').textContent).toBe('none');
  });

  it('shows a correct result from the /api/v1/diagnoses response', async () => {
    global.fetch = mockFetch({
      gameSession: { money: 150 },
      result: { isDiagnosisCorrect: true, isTreatmentCorrect: null, moneyDelta: 50 },
    });
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    expect(screen.getByTestId('is-correct').textContent).toBe('true');
    expect(screen.getByTestId('money-delta').textContent).toBe('50');
    expect(screen.getByTestId('balance').textContent).toBe('150');
    expect(screen.getByTestId('examine-seconds').textContent).toBe('number');
  });

  it('shows an incorrect result with a negative money delta', async () => {
    global.fetch = mockFetch({
      gameSession: { money: 80 },
      result: { isDiagnosisCorrect: false, isTreatmentCorrect: null, moneyDelta: -20 },
    });
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-incorrect'));

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    expect(screen.getByTestId('is-correct').textContent).toBe('false');
    expect(screen.getByTestId('money-delta').textContent).toBe('-20');
    expect(screen.getByTestId('balance').textContent).toBe('80');
    expect(screen.getByTestId('examine-seconds').textContent).toBe('number');
  });

  it('closeResult closes the popup and refetches the round for the next case', async () => {
    let roundCallCount = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              gameSession: { money: 150 },
              result: { isDiagnosisCorrect: true, isTreatmentCorrect: null, moneyDelta: 50 },
            }),
            { status: 200 },
          ),
        );
      }
      roundCallCount += 1;
      return Promise.resolve(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
    });

    const user = userEvent.setup();
    await renderWithProviders();
    expect(roundCallCount).toBe(1);

    await user.click(screen.getByText('submit-correct'));
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));

    await user.click(screen.getByText('close'));

    expect(screen.getByTestId('is-open').textContent).toBe('false');
    await waitFor(() => expect(roundCallCount).toBe(2));
  });

  it('sets an error and does not open the popup when submitDiagnosis rejects', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'diagnosis_already_attempted' }), { status: 409 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
    });
    const user = userEvent.setup();
    await renderWithProviders();
    expect(screen.getByTestId('has-error').textContent).toBe('false');

    await user.click(screen.getByText('submit-correct'));

    await waitFor(() => expect(screen.getByTestId('has-error').textContent).toBe('true'));
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });

  it('does not submit when round.case has not loaded yet', async () => {
    let resolveFetch;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
        }),
    );

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <GameSessionProvider>
            <StatisticsProvider>
              <ResultsProvider>
                <ResultsConsumer />
              </ResultsProvider>
            </StatisticsProvider>
          </GameSessionProvider>
        </RoundProvider>
      </ApiProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('submit-correct'));

    expect(screen.getByTestId('is-open').textContent).toBe('false');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch();
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('false'));
  });

  it('closeResult ends the day instead of refetching the round once the day timer is over', async () => {
    let roundCallCount = 0;
    let dayEndCallCount = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              gameSession: { money: 150 },
              result: { isDiagnosisCorrect: true, isTreatmentCorrect: null, moneyDelta: 50 },
            }),
            { status: 200 },
          ),
        );
      }
      if (pathname === '/api/v1/day/end') {
        dayEndCallCount += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              gameSession: { consecutiveBadDiagnosisCount: 0 },
              dayLog: {
                dayNumber: 1,
                startingMoney: 100,
                endingMoney: 150,
                casesAttempted: 1,
                casesCorrect: 1,
                elapsedMs: DAY_DURATION_SECONDS * 1000,
              },
            }),
            { status: 200 },
          ),
        );
      }
      roundCallCount += 1;
      return Promise.resolve(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
    });

    const user = userEvent.setup();
    await renderWithProviders();
    expect(roundCallCount).toBe(1);

    // Timer runs out while the current patient is still being examined —
    // finishing that examination (submit + close) must end the day, not
    // load a new one out from under an already-ended session.
    await user.click(screen.getByText('end-day-timer'));
    await user.click(screen.getByText('submit-correct'));
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));

    await user.click(screen.getByText('close'));

    expect(screen.getByTestId('is-open').textContent).toBe('false');
    await waitFor(() => expect(dayEndCallCount).toBe(1));
    expect(roundCallCount).toBe(1);
  });
});

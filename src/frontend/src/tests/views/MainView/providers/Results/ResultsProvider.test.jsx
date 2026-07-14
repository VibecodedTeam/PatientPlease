import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import {
  GameSessionProvider,
  useGameSession,
  DAY_DURATION_SECONDS,
} from '../../../../../views/MainView/providers/GameSession';
import { ResultsProvider, useResults } from '../../../../../views/MainView/providers/Results';

const ROUND_RESPONSE = {
  gameSession: { money: 100 },
  case: { id: 'case-uuid' },
};

function ResultsConsumer() {
  const { isOpen, result, error, showResult, closeResult } = useResults();
  const { addElapsedSeconds } = useGameSession();
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
      <button onClick={() => addElapsedSeconds(DAY_DURATION_SECONDS)}>force-day-over</button>
    </div>
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
          <ResultsProvider>
            <ResultsConsumer />
          </ResultsProvider>
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

  it('closeResult does not refetch the round once the day is already over, so a fresh next-day GameDayLog is not created before the player reaches the night shop', async () => {
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
      if (pathname === '/api/v1/day/end') {
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: {}, dayLog: {} }), { status: 200 }),
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

    // Drives the day to its end directly (rather than via real/fake timers),
    // mirroring what a large addElapsedSeconds bump (e.g. an examination's
    // time cost) or the real per-second tick would do once elapsed reaches
    // DAY_DURATION_SECONDS.
    await user.click(screen.getByText('force-day-over'));

    await user.click(screen.getByText('close'));

    expect(screen.getByTestId('is-open').textContent).toBe('false');
    // No additional /api/v1/round call: the day is over, so closeResult
    // defers to the day-end/night-shop flow instead of eagerly refetching
    // (which would otherwise auto-start the next day's GameDayLog early).
    expect(roundCallCount).toBe(1);
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
            <ResultsProvider>
              <ResultsConsumer />
            </ResultsProvider>
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
});

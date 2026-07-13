import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { ResultsProvider, useResults } from '../../../../../views/MainView/providers/Results';

const ROUND_RESPONSE = {
  gameSession: { money: 100 },
  case: { id: 'case-uuid' },
};

function ResultsConsumer() {
  const { isOpen, result, showResult, closeResult } = useResults();
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="is-correct">{result ? String(result.isCorrect) : 'none'}</span>
      <span data-testid="money-delta">{result ? result.moneyDelta : 'none'}</span>
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
        <ResultsProvider>
          <ResultsConsumer />
        </ResultsProvider>
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
          <ResultsProvider>
            <ResultsConsumer />
          </ResultsProvider>
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

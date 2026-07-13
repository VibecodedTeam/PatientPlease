import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider, useRound } from '../../../../../providers/Round';
import { ResultsProvider, useResults } from '../../../../../views/MainView/providers/Results';

const ROUND_RESPONSE = {
  case: {
    id: 'case-uuid',
    moneyReward: 50,
    moneyPenalty: 20,
  },
};

function ResultsConsumer() {
  const { round } = useRound();
  const { isOpen, result, showResult, closeResult } = useResults();
  return (
    <div>
      <span data-testid="case-id">{round?.case?.id ?? 'none'}</span>
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

function mockFetchRoutes(diagnosesHandler) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/diagnoses') {
      return Promise.resolve(diagnosesHandler(request));
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
    global.fetch = mockFetchRoutes(() => new Response('{}', { status: 500 }));
    await renderWithProviders();
    expect(screen.getByTestId('is-open').textContent).toBe('false');
    expect(screen.getByTestId('is-correct').textContent).toBe('none');
  });

  it('shows a correct result using the server-graded isDiagnosisCorrect/moneyDelta', async () => {
    global.fetch = mockFetchRoutes(
      () =>
        new Response(
          JSON.stringify({ gameSession: { money: 150 }, isDiagnosisCorrect: true, moneyDelta: 50 }),
          { status: 200 },
        ),
    );
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    expect(screen.getByTestId('is-correct').textContent).toBe('true');
    expect(screen.getByTestId('money-delta').textContent).toBe('50');
  });

  it('shows an incorrect result using the server-graded isDiagnosisCorrect/moneyDelta', async () => {
    global.fetch = mockFetchRoutes(
      () =>
        new Response(
          JSON.stringify({ gameSession: { money: 80 }, isDiagnosisCorrect: false, moneyDelta: -20 }),
          { status: 200 },
        ),
    );
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-incorrect'));

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    expect(screen.getByTestId('is-correct').textContent).toBe('false');
    expect(screen.getByTestId('money-delta').textContent).toBe('-20');
  });

  it('submits the active case id and the selected diagnosis id to POST /api/v1/diagnoses', async () => {
    let submittedBody;
    global.fetch = mockFetchRoutes((request) => {
      request
        .clone()
        .json()
        .then((body) => {
          submittedBody = body;
        });
      return new Response(
        JSON.stringify({ gameSession: { money: 150 }, isDiagnosisCorrect: true, moneyDelta: 50 }),
        { status: 200 },
      );
    });
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));

    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
    expect(submittedBody).toEqual({ caseId: 'case-uuid', selectedDiagnosisId: 'real-diagnosis-uuid' });
  });

  it('closeResult closes the popup', async () => {
    global.fetch = mockFetchRoutes(
      () =>
        new Response(
          JSON.stringify({ gameSession: { money: 150 }, isDiagnosisCorrect: true, moneyDelta: 50 }),
          { status: 200 },
        ),
    );
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));

    await user.click(screen.getByText('close'));
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });

  it('does not load the next case until close is clicked, then refetches the round', async () => {
    let roundCallCount = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        return Promise.resolve(
          new Response(
            JSON.stringify({ gameSession: { money: 150 }, isDiagnosisCorrect: true, moneyDelta: 50 }),
            { status: 200 },
          ),
        );
      }
      roundCallCount += 1;
      const caseId = roundCallCount === 1 ? 'case-old' : 'case-new';
      return Promise.resolve(
        new Response(
          JSON.stringify({ case: { id: caseId, moneyReward: 50, moneyPenalty: 20 } }),
          { status: 200 },
        ),
      );
    });
    const user = userEvent.setup();
    await renderWithProviders();
    expect(screen.getByTestId('case-id').textContent).toBe('case-old');

    await user.click(screen.getByText('submit-correct'));
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));

    // Submitting alone must not have advanced the case yet.
    expect(screen.getByTestId('case-id').textContent).toBe('case-old');

    await user.click(screen.getByText('close'));

    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-new'));
  });

  it('does not submit before the round finishes loading', async () => {
    let resolveFetch;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
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
    expect(screen.getByTestId('is-correct').textContent).toBe('none');
    expect(screen.getByTestId('money-delta').textContent).toBe('none');
    // Only the round-start request was ever issued — no diagnoses submission attempted.
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('ignores a second submission while the first is still in flight', async () => {
    let resolveDiagnoses;
    global.fetch = mockFetchRoutes(
      () =>
        new Promise((resolve) => {
          resolveDiagnoses = () =>
            resolve(
              new Response(
                JSON.stringify({ gameSession: { money: 150 }, isDiagnosisCorrect: true, moneyDelta: 50 }),
                { status: 200 },
              ),
            );
        }),
    );
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));
    await user.click(screen.getByText('submit-correct'));

    const diagnosesCalls = global.fetch.mock.calls.filter(
      ([request]) => new URL(request.url).pathname === '/api/v1/diagnoses',
    );
    expect(diagnosesCalls).toHaveLength(1);

    resolveDiagnoses();
    await waitFor(() => expect(screen.getByTestId('is-open').textContent).toBe('true'));
  });
});

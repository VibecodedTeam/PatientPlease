import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { ResultsProvider, useResults } from '../../../../../views/MainView/providers/Results';

const ROUND_RESPONSE = {
  case: {
    correctDiagnosisId: 'real-diagnosis-uuid',
    moneyReward: 50,
    moneyPenalty: 20,
  },
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
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(ROUND_RESPONSE), { status: 200 }));
  });

  it('starts closed with no result', async () => {
    await renderWithProviders();
    expect(screen.getByTestId('is-open').textContent).toBe('false');
    expect(screen.getByTestId('is-correct').textContent).toBe('none');
  });

  it('shows a correct result with the real money reward when the selection matches case.correctDiagnosisId', async () => {
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));

    expect(screen.getByTestId('is-open').textContent).toBe('true');
    expect(screen.getByTestId('is-correct').textContent).toBe('true');
    expect(screen.getByTestId('money-delta').textContent).toBe('50');
  });

  it('shows an incorrect result with the real money penalty as a negative delta', async () => {
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-incorrect'));

    expect(screen.getByTestId('is-open').textContent).toBe('true');
    expect(screen.getByTestId('is-correct').textContent).toBe('false');
    expect(screen.getByTestId('money-delta').textContent).toBe('-20');
  });

  it('closeResult closes the popup', async () => {
    const user = userEvent.setup();
    await renderWithProviders();

    await user.click(screen.getByText('submit-correct'));
    expect(screen.getByTestId('is-open').textContent).toBe('true');

    await user.click(screen.getByText('close'));
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });

  it('does not show a fake $0 result when submitted before the round finishes loading', async () => {
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

    resolveFetch();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await user.click(screen.getByText('submit-correct'));
    expect(screen.getByTestId('money-delta').textContent).toBe('50');
  });
});

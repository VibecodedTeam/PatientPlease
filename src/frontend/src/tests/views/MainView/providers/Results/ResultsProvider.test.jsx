import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../views/MainView/providers/Round';
import { ResultsProvider, useResults } from '../../../../../views/MainView/providers/Results';

const ROUND_RESPONSE = {
  case: {
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
      <button onClick={() => showResult({ id: 'skin-cancer', label: 'Skin Cancer' })}>
        submit-correct
      </button>
      <button onClick={() => showResult({ id: 'no-condition', label: 'No Skin Condition' })}>
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

  it('shows a correct result with the real money reward when the placeholder id matches', async () => {
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
});

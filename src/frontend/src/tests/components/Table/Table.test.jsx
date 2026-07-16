import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../../../components/Table/Table';
import styles from '../../../components/Table/Table.module.css';
import { DocumentTableContext } from '../../../components/Table/providers/DocumentTable/DocumentTableProvider';
import { DocumentTableProvider } from '../../../components/Table/providers/DocumentTable';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { GameSessionProvider } from '../../../views/MainView/providers/GameSession';
import { StatisticsProvider } from '../../../views/MainView/providers/Statistics';
import { ResultsProvider, useResults } from '../../../views/MainView/providers/Results';

function ResultsPeek() {
  const { result, closeResult } = useResults();
  return (
    <>
      <span data-testid="results-peek">{result ? JSON.stringify(result) : 'none'}</span>
      <button type="button" onClick={closeResult}>
        Continue
      </button>
    </>
  );
}

function renderWithProviders(ui) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <StatisticsProvider>
            <ResultsProvider>
              <DocumentTableProvider>{ui}</DocumentTableProvider>
              <ResultsPeek />
            </ResultsProvider>
          </StatisticsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Table', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        const body = await request.clone().json();
        const isCorrect = body.selectedDiagnosisId === 'skin-cancer';
        return new Response(
          JSON.stringify({
            gameSession: {},
            result: {
              isDiagnosisCorrect: isCorrect,
              isTreatmentCorrect: null,
              moneyDelta: isCorrect ? 50 : -20,
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ case: { id: 'case-uuid', moneyReward: 50, moneyPenalty: 20 } }),
        { status: 200 },
      );
    });
  });

  it('shows an inline error message when the diagnosis submission fails', async () => {
    global.fetch = jest.fn(async (request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        return new Response(JSON.stringify({ error: 'diagnosis_already_attempted' }), {
          status: 409,
        });
      }
      return new Response(
        JSON.stringify({ case: { id: 'case-uuid', moneyReward: 50, moneyPenalty: 20 } }),
        { status: 200 },
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<Table />);
    // The round load and this click race: retry the click until it lands
    // after the round has loaded (selecting before then gets reset, since
    // Diagnose remounts once a real case id replaces the initial null one).
    await waitFor(async () => {
      await user.click(screen.getByRole('radio', { name: 'Rak skóry' }));
      expect(screen.getByText('Zatwierdź diagnozę')).not.toBeDisabled();
    });
    await user.click(screen.getByText('Zatwierdź diagnozę'));

    await waitFor(() =>
      expect(screen.getByText(/nie udało się zatwierdzić/i)).toBeInTheDocument(),
    );
  });

  it('renders its children', async () => {
    renderWithProviders(
      <Table>
        <span>Patient chart</span>
      </Table>,
    );
    expect(screen.getByText('Patient chart')).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('applies the table layout class to its root element', async () => {
    renderWithProviders(<Table data-testid="table-root">content</Table>);
    expect(screen.getByTestId('table-root')).toHaveClass(styles.table);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('wires Diagnose submissions to useResults().showResult', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Table />);
    await waitFor(async () => {
      await user.click(screen.getByRole('radio', { name: 'Rak skóry' }));
      expect(screen.getByText('Zatwierdź diagnozę')).not.toBeDisabled();
    });
    await user.click(screen.getByText('Zatwierdź diagnozę'));

    await waitFor(() =>
      expect(screen.getByTestId('results-peek').textContent).toBe(
        JSON.stringify({
          selection: { id: 'skin-cancer', label: 'Rak skóry' },
          isCorrect: true,
          moneyDelta: 50,
          examineSeconds: 0,
        }),
      ),
    );
  });

  it('clears the selected diagnosis option once the next case loads, even if that case offers the same option id', async () => {
    let roundCallCount = 0;
    global.fetch = jest.fn(async (request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/diagnoses') {
        return new Response(
          JSON.stringify({
            gameSession: {},
            result: { isDiagnosisCorrect: true, isTreatmentCorrect: null, moneyDelta: 50 },
          }),
          { status: 200 },
        );
      }
      roundCallCount += 1;
      return new Response(
        JSON.stringify({
          case: { id: `case-uuid-${roundCallCount}`, moneyReward: 50, moneyPenalty: 20 },
        }),
        { status: 200 },
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<Table />);
    await waitFor(async () => {
      await user.click(screen.getByRole('radio', { name: 'Rak skóry' }));
      expect(screen.getByText('Zatwierdź diagnozę')).not.toBeDisabled();
    });
    await user.click(screen.getByText('Zatwierdź diagnozę'));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Rak skóry' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );

    await user.click(screen.getByText('Continue'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    expect(screen.getByRole('radio', { name: 'Rak skóry' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('passes the real diagnosisOptions catalog from DocumentTableProvider through to Diagnose', async () => {
    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <GameSessionProvider>
            <StatisticsProvider>
              <ResultsProvider>
                <DocumentTableContext.Provider
                  value={{
                    documents: [],
                    patient: null,
                    diagnosisOptions: [
                      { id: 'dx-1', code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' },
                      { id: 'dx-2', code: 'SEB_KER', name: 'Seborrheic Keratosis', category: 'BENIGN' },
                    ],
                    isLoading: false,
                    error: null,
                  }}
                >
                  <Table />
                </DocumentTableContext.Provider>
              </ResultsProvider>
            </StatisticsProvider>
          </GameSessionProvider>
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('radio', { name: 'Melanoma' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Seborrheic Keratosis' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Rak skóry' })).not.toBeInTheDocument();
  });

  it('disables diagnosis submission while the round is still loading, so the fake DEFAULT_OPTIONS ids can never reach the backend', async () => {
    const user = userEvent.setup();
    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <GameSessionProvider>
            <StatisticsProvider>
              <ResultsProvider>
                <DocumentTableContext.Provider
                  value={{ documents: [], patient: null, diagnosisOptions: [], isLoading: true, error: null }}
                >
                  <Table />
                </DocumentTableContext.Provider>
              </ResultsProvider>
            </StatisticsProvider>
          </GameSessionProvider>
        </RoundProvider>
      </ApiProvider>,
    );

    await user.click(screen.getByRole('radio', { name: 'Rak skóry' }));

    expect(screen.getByText('Zatwierdź diagnozę')).toBeDisabled();
  });
});

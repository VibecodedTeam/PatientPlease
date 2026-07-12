import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../../../components/Table/Table';
import styles from '../../../components/Table/Table.module.css';
import { DocumentTableContext } from '../../../components/Table/providers/DocumentTable/DocumentTableProvider';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { ResultsProvider, useResults } from '../../../views/MainView/providers/Results';

function ResultsPeek() {
  const { result } = useResults();
  return <span data-testid="results-peek">{result ? JSON.stringify(result) : 'none'}</span>;
}

function renderWithProviders(ui) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <ResultsProvider>
          <DocumentTableContext.Provider
            value={{ documents: [], patient: null, isLoading: false, error: null }}
          >
            {ui}
          </DocumentTableContext.Provider>
          <ResultsPeek />
        </ResultsProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Table', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          case: { moneyReward: 50, moneyPenalty: 20, correctDiagnosisId: 'skin-cancer' },
        }),
        { status: 200 },
      ),
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('radio', { name: 'Skin Cancer' }));
    await user.click(screen.getByText('Submit Diagnosis'));

    await waitFor(() =>
      expect(screen.getByTestId('results-peek').textContent).toBe(
        JSON.stringify({
          selection: { id: 'skin-cancer', label: 'Skin Cancer' },
          isCorrect: true,
          moneyDelta: 50,
        }),
      ),
    );
  });

  it('passes the real diagnosisOptions catalog from DocumentTableProvider through to Diagnose', async () => {
    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
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
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('radio', { name: 'Melanoma' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Seborrheic Keratosis' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Skin Cancer' })).not.toBeInTheDocument();
  });
});

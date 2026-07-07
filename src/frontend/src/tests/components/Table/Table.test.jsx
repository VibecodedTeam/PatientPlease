import React from 'react';
import { render, screen } from '@testing-library/react';
import { Table } from '../../../components/Table/Table';
import styles from '../../../components/Table/Table.module.css';
import { DocumentTableContext } from '../../../components/Table/providers/DocumentTable/DocumentTableProvider';

function renderWithProviders(ui) {
  return render(
    <DocumentTableContext.Provider value={{ documents: [], patient: null, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>,
  );
}

describe('Table', () => {
  it('renders its children', () => {
    renderWithProviders(
      <Table>
        <span>Patient chart</span>
      </Table>,
    );
    expect(screen.getByText('Patient chart')).toBeInTheDocument();
  });

  it('applies the table layout class to its root element', () => {
    renderWithProviders(<Table data-testid="table-root">content</Table>);
    expect(screen.getByTestId('table-root')).toHaveClass(styles.table);
  });
});

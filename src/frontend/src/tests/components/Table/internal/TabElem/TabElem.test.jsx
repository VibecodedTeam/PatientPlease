import React from 'react';
import { render, screen } from '@testing-library/react';
import { TabElem } from '../../../../../components/Table/internal/TabElem/TabElem';
import styles from '../../../../../components/Table/internal/TabElem/TabElem.module.css';
import { DocumentTableContext } from '../../../../../components/Table/providers/DocumentTable/DocumentTableProvider';

function renderWithProviders(ui) {
  return render(
    <DocumentTableContext.Provider value={{ documents: [], patient: null, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>,
  );
}

describe('TabElem', () => {
  it('renders its children alongside Information_1 and the Notebook', () => {
    renderWithProviders(
      <TabElem>
        <span>Extra content</span>
      </TabElem>,
    );

    expect(screen.getByText('Dane pacjenta')).toBeInTheDocument();
    expect(screen.getByText('Dokumenty przypadku')).toBeInTheDocument();
    expect(screen.getByText('Badania')).toBeInTheDocument();
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('applies the tabElem layout class to its root element', () => {
    renderWithProviders(<TabElem data-testid="tabElem-root">content</TabElem>);
    expect(screen.getByTestId('tabElem-root')).toHaveClass(styles.tabElem);
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TabElem } from '../../../../components/TableFol/TabElemFol/TabElem';
import styles from '../../../../components/TableFol/TabElemFol/TabElem.module.css';
import { DocumentTableContext } from '../../../../components/TableFol/DocumentTableFol/DocumentTableProvider';

function renderWithProviders(ui) {
  return render(
    <DocumentTableContext.Provider value={{ documents: [], patient: null, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>
  );
}

describe('TabElem', () => {
  it('renders its children alongside the Information cards', () => {
    renderWithProviders(
      <TabElem>
        <span>Extra content</span>
      </TabElem>
    );

    expect(screen.getByText('Patient Information')).toBeInTheDocument();
    expect(screen.getByText('General Patient Story')).toBeInTheDocument();
    expect(screen.getByText('Clinical Symptoms')).toBeInTheDocument();
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('applies the tabElem layout class to its root element', () => {
    renderWithProviders(<TabElem data-testid="tabElem-root">content</TabElem>);
    expect(screen.getByTestId('tabElem-root')).toHaveClass(styles.tabElem);
  });
});

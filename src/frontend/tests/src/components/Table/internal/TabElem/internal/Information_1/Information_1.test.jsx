import React from 'react';
import { render, screen } from '@testing-library/react';
import { Information_1 } from '../../../../../../../../src/components/Table/internal/TabElem/internal/Information_1/Information_1';
import { DocumentTableContext } from '../../../../../../../../src/components/Table/providers/DocumentTable/DocumentTableProvider';
import styles from '../../../../../../../../src/components/Table/internal/TabElem/internal/Information_1/Information_1.module.css';

function renderWithDocumentTable(ui, { patient = null } = {}) {
  return render(
    <DocumentTableContext.Provider value={{ documents: [], patient, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>,
  );
}

describe('Information_1', () => {
  it('renders the given title', () => {
    renderWithDocumentTable(<Information_1 title="Patient Info" />);
    expect(screen.getByText('Patient Info')).toBeInTheDocument();
  });

  it('falls back to placeholder content when no patient is available', () => {
    renderWithDocumentTable(<Information_1 />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Age 42')).toBeInTheDocument();
    expect(screen.getAllByText('Pending clinical note')).toHaveLength(3);
  });

  it('renders real patient fields when a patient is provided', () => {
    renderWithDocumentTable(<Information_1 />, {
      patient: {
        name: 'Jan Kowalski',
        age: 52,
        sex: 'MALE',
        occupation: 'Roofer',
        chiefComplaint: 'A mole on my shoulder has changed shape.',
      },
    });

    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('Age 52')).toBeInTheDocument();
    expect(screen.getByText('Sex: MALE')).toBeInTheDocument();
    expect(screen.getByText('Occupation: Roofer')).toBeInTheDocument();
    expect(
      screen.getByText('Chief complaint: A mole on my shoulder has changed shape.'),
    ).toBeInTheDocument();
  });

  it('applies the card layout class to its root element', () => {
    renderWithDocumentTable(<Information_1 data-testid="card-root" />);
    expect(screen.getByTestId('card-root')).toHaveClass(styles.card);
  });
});

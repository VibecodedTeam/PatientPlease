import React from 'react';
import { render, screen } from '@testing-library/react';
import { Information_1 } from '../../../../../../../components/Table/internal/TabElem/internal/Information_1/Information_1';
import { DocumentTableContext } from '../../../../../../../components/Table/providers/DocumentTable/DocumentTableProvider';
import styles from '../../../../../../../components/Table/internal/TabElem/internal/Information_1/Information_1.module.css';

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
    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('Wiek 42')).toBeInTheDocument();
    expect(screen.getAllByText('Oczekująca notatka kliniczna')).toHaveLength(3);
  });

  it('renders real patient fields, mapping sex to a Polish label, when a patient is provided', () => {
    renderWithDocumentTable(<Information_1 />, {
      patient: {
        name: 'Jan Kowalski',
        age: 52,
        sex: 'MALE',
        occupation: 'Roofer',
      },
    });

    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('Wiek 52')).toBeInTheDocument();
    expect(screen.getByText('Płeć: Mężczyzna')).toBeInTheDocument();
    expect(screen.getByText('Zawód: Roofer')).toBeInTheDocument();
  });

  it('maps a female patient sex to the Polish label', () => {
    renderWithDocumentTable(<Information_1 />, {
      patient: { name: 'Anna Nowak', age: 60, sex: 'FEMALE', occupation: null },
    });

    expect(screen.getByText('Płeć: Kobieta')).toBeInTheDocument();
  });

  it('applies the card layout class to its root element', () => {
    renderWithDocumentTable(<Information_1 data-testid="card-root" />);
    expect(screen.getByTestId('card-root')).toHaveClass(styles.card);
  });
});

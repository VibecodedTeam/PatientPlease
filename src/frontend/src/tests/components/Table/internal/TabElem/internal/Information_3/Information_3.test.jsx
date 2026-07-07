import React from 'react';
import { render, screen } from '@testing-library/react';
import { Information_3 } from '../../../../../../../components/Table/internal/TabElem/internal/Information_3/Information_3';
import { DocumentTableContext } from '../../../../../../../components/Table/providers/DocumentTable/DocumentTableProvider';

function renderWithDocumentTable(ui, { documents = [] } = {}) {
  return render(
    <DocumentTableContext.Provider value={{ documents, patient: null, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>,
  );
}

describe('Information_3', () => {
  it('renders the given title', () => {
    renderWithDocumentTable(<Information_3 title="Symptoms" />);
    expect(screen.getByText('Symptoms')).toBeInTheDocument();
  });

  it('falls back to default symptoms when no CLINICAL_SYMPTOMS document exists', () => {
    renderWithDocumentTable(<Information_3 />);
    expect(screen.getByText('Itching')).toBeInTheDocument();
    expect(screen.getByText('2 weeks')).toBeInTheDocument();
  });

  it('renders symptoms from a CLINICAL_SYMPTOMS document when one exists', () => {
    renderWithDocumentTable(<Information_3 />, {
      documents: [
        {
          id: 'd9',
          type: 'CLINICAL_SYMPTOMS',
          title: 'Symptoms',
          content: { symptoms: [{ name: 'Bleeding', duration: '1 day' }] },
        },
      ],
    });

    expect(screen.getByText('Bleeding')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.queryByText('Itching')).not.toBeInTheDocument();
  });
});

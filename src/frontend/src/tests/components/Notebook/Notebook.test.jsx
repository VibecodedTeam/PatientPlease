import React from 'react';
import { render, screen } from '@testing-library/react';
import { Notebook } from '../../../components/Notebook';
import { DocumentTableContext } from '../../../components/Table/providers/DocumentTable/DocumentTableProvider';

function renderWithDocumentTable(documents) {
  return render(
    <DocumentTableContext.Provider value={{ documents, patient: null, isLoading: false, error: null }}>
      <Notebook />
    </DocumentTableContext.Provider>,
  );
}

describe('Notebook', () => {
  it('renders history documents on the left page', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd1',
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Sun exposure history',
        content: { sunbedUse: 'frequent', occupationalExposure: 'high' },
      },
    ]);

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(container.textContent).toContain('Sun exposure history:');
    expect(container.textContent).toContain('Sunbed Use: frequent');
    expect(container.textContent).toContain('Occupational Exposure: high');
  });

  it('shows the empty state when there are no history documents', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No history recorded yet.')).toBeInTheDocument();
  });

  it('renders the clinical symptoms document on the right page', () => {
    renderWithDocumentTable([
      {
        id: 'd2',
        type: 'CLINICAL_SYMPTOMS',
        title: 'Symptoms',
        content: { description: 'Itching and bleeding for the past week.' },
      },
    ]);

    expect(screen.getByText('Symptoms')).toBeInTheDocument();
    expect(screen.getByText('Itching and bleeding for the past week.')).toBeInTheDocument();
  });

  it('shows the empty state when there is no clinical symptoms document', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No symptoms documented yet.')).toBeInTheDocument();
  });

  it('renders every exam results document, including multiple results', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd3',
        type: 'EXAMINATION_RESULTS',
        title: 'Dermoscopy',
        content: { finding: 'Irregular pigment network' },
      },
      {
        id: 'd4',
        type: 'EXAMINATION_RESULTS',
        title: 'Biopsy',
        content: { finding: 'Atypical melanocytes' },
      },
    ]);

    expect(screen.getByText('Exam Results')).toBeInTheDocument();
    expect(container.textContent).toContain('Dermoscopy: Irregular pigment network');
    expect(container.textContent).toContain('Biopsy: Atypical melanocytes');
  });

  it('shows the empty state when no examinations have been ordered', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No examinations ordered yet.')).toBeInTheDocument();
  });
});

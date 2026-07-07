import React from 'react';
import { render, screen } from '@testing-library/react';
import { Information_2 } from '../../../../../components/TableFol/TabElemFol/Information_2Fol/Information_2';
import { DocumentTableContext } from '../../../../../components/TableFol/DocumentTableFol/DocumentTableProvider';

function renderWithDocumentTable(ui, { documents = [] } = {}) {
  return render(
    <DocumentTableContext.Provider value={{ documents, patient: null, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>
  );
}

describe('Information_2', () => {
  it('renders the given title', () => {
    renderWithDocumentTable(<Information_2 title="Patient Story" />);
    expect(screen.getByText('Patient Story')).toBeInTheDocument();
  });

  it('falls back to the default story when no history documents exist', () => {
    renderWithDocumentTable(<Information_2 />);
    expect(screen.getByText(/Lorem ipsum/)).toBeInTheDocument();
  });

  it('renders every document whose type contains HISTORY, formatting object content', () => {
    const { container } = renderWithDocumentTable(<Information_2 />, {
      documents: [
        {
          id: 'd2',
          type: 'UV_EXPOSURE_HISTORY',
          title: 'Sun exposure history',
          content: { sunbedUse: 'frequent', occupationalExposure: 'high' },
        },
        { id: 'd3', type: 'SKIN_IMAGE', title: 'Left shoulder', content: null },
      ],
    });

    expect(container.textContent).toContain('Sun exposure history:');
    expect(container.textContent).toContain('Sunbed Use: frequent');
    expect(container.textContent).toContain('Occupational Exposure: high');
    expect(screen.queryByText(/Lorem ipsum/)).not.toBeInTheDocument();
  });
});

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
  it('renders all five reveal-gated document types as a flat list on the left page, with no subheadings', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd1',
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Sun exposure history',
        content: { sunbedUse: 'frequent', occupationalExposure: 'high' },
      },
      {
        id: 'd2',
        type: 'CLINICAL_SYMPTOMS',
        title: 'Symptoms',
        content: { description: 'Itching and bleeding for the past week.' },
      },
    ]);

    expect(screen.getByText('Case Documents')).toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.queryByText('Symptoms')).not.toBeInTheDocument();
    expect(container.textContent).toContain('Sun exposure history:');
    expect(container.textContent).toContain('Sunbed Use: frequent');
    expect(container.textContent).toContain('Occupational Exposure: high');
    expect(container.textContent).toContain('Symptoms: Itching and bleeding for the past week.');
  });

  it('renders DISEASE_HISTORY, FAMILY_HISTORY, and WEATHER_HISTORY documents on the left page', () => {
    const { container } = renderWithDocumentTable([
      { id: 'd3', type: 'DISEASE_HISTORY', title: 'Disease history', content: 'None reported.' },
      { id: 'd4', type: 'FAMILY_HISTORY', title: 'Family history', content: 'Father: melanoma.' },
      { id: 'd5', type: 'WEATHER_HISTORY', title: 'Weather history', content: 'High UV index region.' },
    ]);

    expect(container.textContent).toContain('Disease history: None reported.');
    expect(container.textContent).toContain('Family history: Father: melanoma.');
    expect(container.textContent).toContain('Weather history: High UV index region.');
  });

  it('shows the empty state when there are no case documents', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No case documents revealed yet.')).toBeInTheDocument();
  });

  it('renders every exam results document, including multiple results', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd6',
        type: 'EXAMINATION_RESULTS',
        title: 'Dermoscopy',
        content: { finding: 'Irregular pigment network' },
      },
      {
        id: 'd7',
        type: 'EXAMINATION_RESULTS',
        title: 'Biopsy',
        content: { finding: 'Atypical melanocytes' },
      },
    ]);

    expect(screen.getByText('Examinations')).toBeInTheDocument();
    expect(container.textContent).toContain('Dermoscopy: Irregular pigment network');
    expect(container.textContent).toContain('Biopsy: Atypical melanocytes');
  });

  it('shows the empty state when no examinations have been completed', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No examinations completed yet.')).toBeInTheDocument();
  });

  it('shows only the findings text for an exam result whose content also carries a shopItemId, with no "Findings" label or raw id', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd8',
        type: 'EXAMINATION_RESULTS',
        title: 'Punch Biopsy',
        content: {
          shopItemId: '019f6604-fb9d-7787-a1f2-359e2c1522e7',
          findings: 'Excision biopsy confirms melanoma.',
        },
      },
    ]);

    expect(container.textContent).toContain('Punch Biopsy: Excision biopsy confirms melanoma.');
    expect(container.textContent).not.toContain('Shop Item Id');
    expect(container.textContent).not.toContain('019f6604-fb9d-7787-a1f2-359e2c1522e7');
    expect(container.textContent).not.toContain('Findings:');
  });
});

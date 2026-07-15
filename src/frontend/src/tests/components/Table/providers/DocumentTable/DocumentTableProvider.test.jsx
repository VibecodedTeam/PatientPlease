import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { DocumentTableProvider, useDocumentTable } from '../../../../../components/Table/providers/DocumentTable';

function DocumentsConsumer() {
  const { documents, isLoading, error } = useDocumentTable();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error</span>;
  return <span>{documents.length} documents</span>;
}

function DiagnosisOptionsConsumer() {
  const { diagnosisOptions } = useDocumentTable();
  return <span>{diagnosisOptions.map((option) => option.name).join(',')}</span>;
}

describe('DocumentTableProvider', () => {
  it('narrows RoundProvider data down to case.documents', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ case: { documents: [{ id: 'doc-1' }, { id: 'doc-2' }] } }), {
        status: 200,
      }),
    );

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <DocumentTableProvider>
            <DocumentsConsumer />
          </DocumentTableProvider>
        </RoundProvider>
      </ApiProvider>,
    );

    expect(await screen.findByText('2 documents')).toBeInTheDocument();
  });

  it('narrows RoundProvider data down to diagnosisOptions', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          case: { documents: [] },
          diagnosisOptions: [
            { id: 'dx-1', code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' },
            { id: 'dx-2', code: 'SEB_KER', name: 'Seborrheic Keratosis', category: 'BENIGN' },
          ],
        }),
        { status: 200 },
      ),
    );

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <DocumentTableProvider>
            <DiagnosisOptionsConsumer />
          </DocumentTableProvider>
        </RoundProvider>
      </ApiProvider>,
    );

    expect(await screen.findByText('Melanoma,Seborrheic Keratosis')).toBeInTheDocument();
  });
});

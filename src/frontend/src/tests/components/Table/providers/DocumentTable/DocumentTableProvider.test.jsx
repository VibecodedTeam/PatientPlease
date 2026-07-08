import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoundProvider } from '../../../../../views/MainView';
import { DocumentTableProvider, useDocumentTable } from '../../../../../components/Table/providers/DocumentTable';

function DocumentsConsumer() {
  const { documents, isLoading, error } = useDocumentTable();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error</span>;
  return <span>{documents.length} documents</span>;
}

describe('DocumentTableProvider', () => {
  it('narrows RoundProvider data down to case.documents', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ case: { documents: [{ id: 'doc-1' }, { id: 'doc-2' }] } }), {
        status: 200,
      }),
    );

    render(
      <RoundProvider>
        <DocumentTableProvider>
          <DocumentsConsumer />
        </DocumentTableProvider>
      </RoundProvider>,
    );

    expect(await screen.findByText('2 documents')).toBeInTheDocument();
  });
});

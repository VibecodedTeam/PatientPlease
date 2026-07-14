import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { DocumentTableProvider } from '../../../components/Table/providers/DocumentTable';
import { Book } from '../../../components/Book';

function renderBook(documents) {
  global.fetch = jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ case: { documents } }), { status: 200 }),
  );
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <DocumentTableProvider>
          <Book />
        </DocumentTableProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Book', () => {
  it('renders a blank page with no fallback/placeholder content when there are no documents', async () => {
    renderBook([]);

    const region = await screen.findByLabelText('Patient documents');
    expect(region).toBeEmptyDOMElement();
    expect(screen.queryByText(/lorem/i)).not.toBeInTheDocument();
  });

  it('renders one page per revealed document, showing its title', async () => {
    renderBook([
      { id: 'doc-1', title: 'Left shoulder — day 1', imageUrl: null, imageAltText: null },
      { id: 'doc-2', title: 'UV exposure history', imageUrl: null, imageAltText: null },
    ]);

    expect(await screen.findByText('Left shoulder — day 1')).toBeInTheDocument();
    expect(screen.getByText('UV exposure history')).toBeInTheDocument();
  });

  it('renders a document image when imageUrl is present', async () => {
    renderBook([
      {
        id: 'doc-1',
        title: 'Lesion photo',
        imageUrl: 'https://cdn.test/lesion.png',
        imageAltText: 'Asymmetric mole',
      },
    ]);

    const image = await screen.findByAltText('Asymmetric mole');
    expect(image).toHaveAttribute('src', 'https://cdn.test/lesion.png');
  });
});

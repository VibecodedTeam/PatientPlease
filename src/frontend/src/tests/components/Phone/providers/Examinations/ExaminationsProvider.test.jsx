import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import {
  ExaminationsProvider,
  useExaminations,
} from '../../../../../components/Phone/providers/Examinations';

const CATALOG = {
  money: 100,
  items: [
    {
      id: 'exam-1',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
    {
      id: 'exam-2',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: "Magnified, polarized imaging that reveals a lesion's sub-surface structures.",
      itemType: 'EXAMINATION',
      price: 80,
      unlockDay: null,
      iconImageUrl: null,
      owned: false,
    },
    {
      id: 'book-1',
      sku: 'abcde-rule',
      name: 'ABCDE Rule',
      description: 'A diagnostic guide handbook.',
      itemType: 'HANDBOOK',
      price: 50,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
  ],
};

function Probe() {
  const { examinations, isLoading, error } = useExaminations();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error</span>;
  return (
    <ul>
      {examinations.map((exam) => (
        <li key={exam.id}>
          {exam.name} - {exam.price} - {exam.owned ? 'owned' : 'not-owned'}
        </li>
      ))}
    </ul>
  );
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <ExaminationsProvider>
          <Probe />
        </ExaminationsProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('ExaminationsProvider', () => {
  it('narrows RoundProvider shopCatalog down to EXAMINATION-type items only', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG), { status: 200 }));
    renderProvider();

    await waitFor(() => expect(screen.getByText('Punch Biopsy - 140 - owned')).toBeInTheDocument());
    expect(screen.getByText('Dermoscopy Imaging - 80 - not-owned')).toBeInTheDocument();
    expect(screen.queryByText(/ABCDE Rule/)).not.toBeInTheDocument();
  });

  it('exposes an error when the catalog fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    renderProvider();
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { GameSessionProvider } from '../../../../../views/MainView/providers/GameSession';
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
      timeCostMs: 90000,
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
      timeCostMs: 30000,
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
      timeCostMs: null,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
  ],
};

const ROUND = {
  gameSession: { id: 'gs1', money: 100, status: 'ACTIVE' },
  ownedItems: [],
  case: { id: 'case-1', patient: { id: 'p1' }, documents: [] },
  diagnosisOptions: [],
  treatmentOptions: [],
};

function Probe() {
  const { examinations, isLoading, error, order, orderingId, orderError } = useExaminations();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error</span>;
  return (
    <div>
      <ul>
        {examinations.map((exam) => (
          <li key={exam.id}>
            {exam.name} - {exam.price} - {exam.timeCostMs} - {exam.owned ? 'owned' : 'not-owned'}
          </li>
        ))}
      </ul>
      <span data-testid="ordering-id">{orderingId ?? 'none'}</span>
      <span data-testid="order-error">{orderError ? 'error' : 'none'}</span>
      <button onClick={() => order('exam-1')}>order-owned</button>
      <button onClick={() => order('exam-2')}>order-unowned</button>
    </div>
  );
}

function mockRoundAndShopFetch(shopResponseFactory) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') {
      return Promise.resolve(new Response(JSON.stringify(ROUND), { status: 200 }));
    }
    if (pathname === '/api/v1/shop') {
      return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
    }
    return shopResponseFactory(request);
  });
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <ExaminationsProvider>
            <Probe />
          </ExaminationsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('ExaminationsProvider', () => {
  it('narrows RoundProvider shopCatalog down to EXAMINATION-type items only, including timeCostMs', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG), { status: 200 }));
    renderProvider();

    await waitFor(() =>
      expect(screen.getByText('Punch Biopsy - 140 - 90000 - owned')).toBeInTheDocument(),
    );
    expect(screen.getByText('Dermoscopy Imaging - 80 - 30000 - not-owned')).toBeInTheDocument();
    expect(screen.queryByText(/ABCDE Rule/)).not.toBeInTheDocument();
  });

  it('exposes an error when the catalog fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    renderProvider();
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });

  it('order() POSTs /api/v1/examinations for an owned item and resolves', async () => {
    const user = userEvent.setup();
    global.fetch = mockRoundAndShopFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            gameSession: { money: 100 },
            caseExamination: { id: 'ce1' },
            timeCostMs: 90000,
          }),
          { status: 200 },
        ),
      ),
    );
    renderProvider();
    await waitFor(() => screen.getByText('Punch Biopsy - 140 - 90000 - owned'));

    await user.click(screen.getByText('order-owned'));

    await waitFor(() => expect(screen.getByTestId('ordering-id').textContent).toBe('none'));
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(examinationRequest).toBeDefined();
    expect(examinationRequest.method).toBe('POST');
    expect(await examinationRequest.clone().json()).toEqual({
      caseId: 'case-1',
      shopItemId: 'exam-1',
    });
    expect(screen.getByTestId('order-error').textContent).toBe('none');
  });

  it('order() does nothing for an unowned item (no examinations call)', async () => {
    const user = userEvent.setup();
    global.fetch = mockRoundAndShopFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => screen.getByText('Dermoscopy Imaging - 80 - 30000 - not-owned'));

    await user.click(screen.getByText('order-unowned'));

    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(examinationRequest).toBeUndefined();
  });

  it('order() sets orderError when the backend rejects the order (e.g. already ordered)', async () => {
    const user = userEvent.setup();
    global.fetch = mockRoundAndShopFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'ExaminationAlreadyOrderedError' }), { status: 409 }),
      ),
    );
    renderProvider();
    await waitFor(() => screen.getByText('Punch Biopsy - 140 - 90000 - owned'));

    await user.click(screen.getByText('order-owned'));

    await waitFor(() => expect(screen.getByTestId('order-error').textContent).toBe('error'));
    expect(screen.getByTestId('ordering-id').textContent).toBe('none');
  });
});

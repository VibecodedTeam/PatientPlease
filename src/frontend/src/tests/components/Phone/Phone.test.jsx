import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { GameSessionProvider } from '../../../views/MainView/providers/GameSession';
import { ExaminationsProvider } from '../../../components/Phone/providers/Examinations';
import { Phone } from '../../../components/Phone';

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
      description: 'Magnified, polarized imaging.',
      itemType: 'EXAMINATION',
      price: 80,
      timeCostMs: 30000,
      unlockDay: null,
      iconImageUrl: null,
      owned: false,
    },
  ],
};

const ROUND = {
  gameSession: { id: 'gs1', money: 100, status: 'ACTIVE' },
  ownedItems: [],
  case: { id: 'case-1', patient: { id: 'p1', name: 'Jordan Ellis', age: 52 }, documents: [] },
  diagnosisOptions: [],
  treatmentOptions: [],
};

function mockRoundAndShopFetch(otherResponseFactory) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') {
      return Promise.resolve(new Response(JSON.stringify(ROUND), { status: 200 }));
    }
    if (pathname === '/api/v1/shop') {
      return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
    }
    return otherResponseFactory(request);
  });
}

function renderPhone(onCancel = jest.fn()) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <ExaminationsProvider>
            <Phone onCancel={onCancel} />
          </ExaminationsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Phone', () => {
  beforeEach(() => {
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
  });

  it('renders English copy with the real patient, not the old Polish/hardcoded copy', async () => {
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Order laboratory tests' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('Jordan Ellis', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('52', { exact: false })).toBeInTheDocument();

    expect(screen.queryByText('Zleć badania')).not.toBeInTheDocument();
    expect(screen.queryByText(/Anna Kowalska/)).not.toBeInTheDocument();
  });

  it('shows the time cost (not price) as the emphasized action cost for an owned examination', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getByText('+90s')).toBeInTheDocument();
  });

  it('disables an unowned examination with an English "buy at night" hint', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Dermoscopy Imaging'));

    expect(screen.getByText(/buy at the night shop to unlock/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /order/i, hidden: false })).not.toBeNull();
    // The unowned row must not expose an enabled Order button.
    const orderButtons = screen.getAllByRole('button', { name: 'Order' });
    expect(orderButtons).toHaveLength(1);
  });

  it('clicking Order on an owned examination calls the examinations endpoint', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: 'Order' }));

    await waitFor(() => {
      const examinationRequest = global.fetch.mock.calls
        .map(([request]) => request)
        .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
      expect(examinationRequest).toBeDefined();
    });
    // Let the full order() chain (addElapsedSeconds + refreshRound) settle
    // before the test ends, so no state update lands after unmount.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Order' })).toBeEnabled());
  });

  it('shows a pending state on the row being ordered', async () => {
    let resolveOrder;
    global.fetch = mockRoundAndShopFetch(
      () =>
        new Promise((resolve) => {
          resolveOrder = () =>
            resolve(
              new Response(
                JSON.stringify({
                  gameSession: { money: 100 },
                  caseExamination: { id: 'ce1' },
                  timeCostMs: 90000,
                }),
                { status: 200 },
              ),
            );
        }),
    );
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: 'Order' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ordering…' })).toBeDisabled());
    resolveOrder();
    // Let the full order() chain (addElapsedSeconds + refreshRound) settle
    // before the test ends, so no state update lands after unmount.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Order' })).toBeEnabled());
  });

  it('calls onCancel when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders a neutral header when there is no active-case patient', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: { money: 100 }, case: null }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
    });
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Order laboratory tests' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.queryByText(/Patient:/)).not.toBeInTheDocument();
  });
});

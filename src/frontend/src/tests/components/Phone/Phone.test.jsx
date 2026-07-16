import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    {
      id: 'exam-3',
      sku: 'exam-skin-swab',
      name: 'Skin Swab Culture',
      description: 'A surface swab cultured to check for a bacterial or fungal cause.',
      itemType: 'EXAMINATION',
      price: 60,
      timeCostMs: 20000,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
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

function rowFor(text) {
  return screen.getByText(text).closest('div');
}

describe('Phone', () => {
  beforeEach(() => {
    window.open = jest.fn(() => ({}));
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

  it('renders Polish copy with the real patient, not old hardcoded placeholder copy', async () => {
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Zleć badania laboratoryjne' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('Jordan Ellis', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('52', { exact: false })).toBeInTheDocument();

    expect(screen.queryByText(/Anna Kowalska/)).not.toBeInTheDocument();
  });

  it('shows the time cost (not price) as the emphasized action cost for a non-biopsy owned examination', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Skin Swab Culture'));

    expect(screen.getByText('+20s')).toBeInTheDocument();
  });

  it('does not show a time-cost duration next to Punch Biopsy, since its real cost is the minigame itself', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(within(rowFor('Punch Biopsy')).queryByText(/^\+\d+s$/)).not.toBeInTheDocument();
  });

  it('disables an unowned examination with a Polish "buy at night" hint', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Dermoscopy Imaging'));

    expect(screen.getByText(/kup w sklepie nocnym, aby odblokować/i)).toBeInTheDocument();
    // Two owned rows (Punch Biopsy, Skin Swab Culture) each expose an Order button.
    const orderButtons = screen.getAllByRole('button', { name: 'Zamów' });
    expect(orderButtons).toHaveLength(2);
  });

  it('clicking Order on a non-biopsy owned examination still calls the examinations endpoint directly', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Skin Swab Culture'));

    await user.click(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Zamów' }));

    await waitFor(() => {
      const examinationRequest = global.fetch.mock.calls
        .map(([request]) => request)
        .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
      expect(examinationRequest).toBeDefined();
    });
    expect(window.open).not.toHaveBeenCalled();
    // Let the full order() chain (addElapsedSeconds + refreshRound) settle
    // before the test ends, so no state update lands after unmount.
    await waitFor(() =>
      expect(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Zamów' })).toBeEnabled(),
    );
  });

  it('shows a pending state on the row being ordered directly', async () => {
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
                  timeCostMs: 20000,
                }),
                { status: 200 },
              ),
            );
        }),
    );
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Skin Swab Culture'));

    await user.click(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Zamów' }));

    await waitFor(() =>
      expect(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Zamawianie…' })).toBeDisabled(),
    );
    resolveOrder();
    await waitFor(() =>
      expect(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Zamów' })).toBeEnabled(),
    );
  });

  it('clicking Order on Punch Biopsy opens the minigame in a new tab and closes Phone, without ordering directly', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(within(rowFor('Punch Biopsy')).getByRole('button', { name: 'Zamów' }));

    expect(window.open).toHaveBeenCalledWith(
      '/game/main/minigame?shopItemId=exam-1&caseId=case-1',
      '_blank',
    );
    expect(onCancel).toHaveBeenCalled();
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(examinationRequest).toBeUndefined();
  });

  it('calls onCancel when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /^zamknij$/i }));

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

    expect(screen.getByRole('heading', { name: 'Zleć badania laboratoryjne' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.queryByText(/Pacjent:/)).not.toBeInTheDocument();
  });
});

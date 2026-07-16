import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { NightView } from '../../../views/NightView';

const SHOP_BEFORE_BUY = {
  items: [
    {
      id: 'i1',
      sku: 's1',
      name: 'Atlas of Dermatology',
      description: 'A high-resolution reference for reading pigment networks.',
      itemType: 'HANDBOOK',
      price: 45,
      owned: false,
      timeCostMs: null,
    },
    {
      id: 'i2',
      sku: 's2',
      name: 'Dermatoscope',
      description: 'A magnifying tool for close examination of lesions.',
      itemType: 'EQUIPMENT',
      price: 60,
      owned: true,
      timeCostMs: null,
    },
    {
      id: 'i3',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      owned: false,
      timeCostMs: 90000,
    },
    {
      id: 'i4',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: 'Magnified, polarized imaging.',
      itemType: 'EXAMINATION',
      price: 80,
      owned: false,
      timeCostMs: 30000,
    },
  ],
  money: 120,
  isNightPhase: true,
  upcomingDayNumber: 2,
  inventoryCapacity: 1,
};

const SHOP_AFTER_BUY = {
  ...SHOP_BEFORE_BUY,
  items: [
    { ...SHOP_BEFORE_BUY.items[0], owned: true },
    SHOP_BEFORE_BUY.items[1],
  ],
  money: 75,
};

function jsonResponse(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function mockFetch({ shopResponses = [SHOP_BEFORE_BUY] } = {}) {
  let shopCallCount = 0;
  global.fetch = jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') {
      return jsonResponse({ gameSession: { id: 'g1', money: SHOP_BEFORE_BUY.money, status: 'ACTIVE' } });
    }
    if (pathname === '/api/v1/shop' && request.method === 'GET') {
      const body = shopResponses[Math.min(shopCallCount, shopResponses.length - 1)];
      shopCallCount += 1;
      return jsonResponse(body);
    }
    if (pathname === '/api/v1/shop/purchase' && request.method === 'POST') {
      return jsonResponse({
        gameSession: { id: 'g1', money: 75, status: 'ACTIVE' },
        ownedItem: { id: 'owned-1' },
      });
    }
    return jsonResponse({}, 404);
  });
}

function renderNightView() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <MemoryRouter initialEntries={['/game/night']}>
          <Routes>
            <Route path="/game/night" element={<NightView />} />
            <Route path="/game/main" element={<div>Main View Stub</div>} />
          </Routes>
        </MemoryRouter>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('NightView', () => {
  it('renders the shop heading and balance from the backend', async () => {
    mockFetch();
    renderNightView();

    expect(screen.getByRole('heading', { name: 'Sklep z przedmiotami' })).toBeInTheDocument();
    expect(screen.getByText('Koniec zmiany')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('120')).toBeInTheDocument());
  });

  it('renders the catalog and marks owned items with no select control', async () => {
    mockFetch();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    expect(screen.getByText('$45')).toBeInTheDocument();
    expect(screen.getByText('Dermatoscope')).toBeInTheDocument();
    expect(screen.getByText('$60')).toBeInTheDocument();
    expect(screen.getByText('W bibliotece')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /wybierz dermatoscope/i })).not.toBeInTheDocument();
  });

  it('starts with nothing selected and a Skip action', async () => {
    mockFetch();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Nie wybrano żadnych przedmiotów')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Pomiń' })).toBeInTheDocument();
  });

  it('selecting an item updates the cart total and the action button', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /wybierz atlas of dermatology/i }));

    expect(screen.getByText('Wybrano 1 przedmiot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kup · $45' })).toBeInTheDocument();
  });

  it('buying purchases the selection, refreshes the catalog, and redirects to /game/main', async () => {
    mockFetch({ shopResponses: [SHOP_BEFORE_BUY, SHOP_AFTER_BUY] });
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /wybierz atlas of dermatology/i }));
    await user.click(screen.getByRole('button', { name: 'Kup · $45' }));

    await waitFor(() => expect(screen.getByText('Main View Stub')).toBeInTheDocument());
    const purchaseRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/shop/purchase');
    expect(purchaseRequest).toBeDefined();
    expect(purchaseRequest.method).toBe('POST');
  });

  it('skipping (nothing selected) redirects to /game/main', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pomiń' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Pomiń' }));

    expect(screen.getByText('Main View Stub')).toBeInTheDocument();
  });

  it('hides the time-cost suffix for Punch Biopsy but still shows it for other examinations', async () => {
    mockFetch();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('$140')).toBeInTheDocument();
    expect(screen.getByText('$80 +30s')).toBeInTheDocument();
  });
});

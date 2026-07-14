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

    expect(screen.getByRole('heading', { name: 'Shop for Items' })).toBeInTheDocument();
    expect(screen.getByText('End of shift')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('120')).toBeInTheDocument());
  });

  it('renders the catalog and marks owned items with no select control', async () => {
    mockFetch();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    expect(screen.getByText('$45')).toBeInTheDocument();
    expect(screen.getByText('Dermatoscope')).toBeInTheDocument();
    expect(screen.getByText('$60')).toBeInTheDocument();
    expect(screen.getByText('In library')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /select dermatoscope/i })).not.toBeInTheDocument();
  });

  it('starts with nothing selected and a Skip action', async () => {
    mockFetch();
    renderNightView();

    await waitFor(() => expect(screen.getByText('No items selected')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('selecting an item updates the cart total and the action button', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /select atlas of dermatology/i }));

    expect(screen.getByText('1 item selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy · $45' })).toBeInTheDocument();
  });

  it('buying purchases the selection, refreshes the catalog, and redirects to /game/main', async () => {
    mockFetch({ shopResponses: [SHOP_BEFORE_BUY, SHOP_AFTER_BUY] });
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /select atlas of dermatology/i }));
    await user.click(screen.getByRole('button', { name: 'Buy · $45' }));

    await waitFor(() => expect(screen.getByText('Main View Stub')).toBeInTheDocument());
    const purchaseRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/shop/purchase');
    expect(purchaseRequest).toBeDefined();
    expect(purchaseRequest.method).toBe('POST');
  });

  it('stays on the night shop and shows an error when the purchase fails, instead of redirecting to /game/main', async () => {
    let shopCallCount = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return jsonResponse({ gameSession: { id: 'g1', money: SHOP_BEFORE_BUY.money, status: 'ACTIVE' } });
      }
      if (pathname === '/api/v1/shop' && request.method === 'GET') {
        const body = shopCallCount === 0 ? SHOP_BEFORE_BUY : SHOP_BEFORE_BUY;
        shopCallCount += 1;
        return jsonResponse(body);
      }
      if (pathname === '/api/v1/shop/purchase' && request.method === 'POST') {
        return jsonResponse({ error: 'not_night_phase' }, 409);
      }
      return jsonResponse({}, 404);
    });
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /select atlas of dermatology/i }));
    await user.click(screen.getByRole('button', { name: 'Buy · $45' }));

    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Shop for Items' })).toBeInTheDocument();
    expect(screen.queryByText('Main View Stub')).not.toBeInTheDocument();
  });

  it.each([
    ['not_night_phase', "It's not night yet — come back once the day ends."],
    ['insufficient_funds', "You don't have enough money for this purchase."],
    ['item_locked', "This item isn't unlocked yet."],
    ['item_already_owned', 'You already own this item.'],
    ['item_not_found', 'This item is no longer available.'],
    ['no_active_game', 'No active game session — try restarting.'],
  ])(
    'shows a human-readable message for the %s purchase error instead of the raw HTTP status line',
    async (errorCode, expectedMessage) => {
      global.fetch = jest.fn().mockImplementation((request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === '/api/v1/round') {
          return jsonResponse({ gameSession: { id: 'g1', money: SHOP_BEFORE_BUY.money, status: 'ACTIVE' } });
        }
        if (pathname === '/api/v1/shop' && request.method === 'GET') {
          return jsonResponse(SHOP_BEFORE_BUY);
        }
        if (pathname === '/api/v1/shop/purchase' && request.method === 'POST') {
          return jsonResponse({ error: errorCode }, errorCode === 'item_not_found' ? 404 : 409);
        }
        return jsonResponse({}, 404);
      });
      const user = userEvent.setup();
      renderNightView();

      await waitFor(() => expect(screen.getByText('Atlas of Dermatology')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /select atlas of dermatology/i }));
      await user.click(screen.getByRole('button', { name: 'Buy · $45' }));

      await waitFor(() =>
        expect(screen.getByText(`Something went wrong: ${expectedMessage}`)).toBeInTheDocument(),
      );
    },
  );

  it('skipping (nothing selected) redirects to /game/main', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderNightView();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(screen.getByText('Main View Stub')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { NightView } from '../../../views/NightView';

const CATALOG = {
  money: 100,
  items: [
    { id: 'a', sku: 'A', name: 'Atlas of Dermoscopy', description: 'ref', itemType: 'HANDBOOK', price: 40, unlockDay: null, iconImageUrl: null, owned: false },
    { id: 'b', sku: 'B', name: 'UV Meter', description: 'tool', itemType: 'EQUIPMENT', price: 70, unlockDay: null, iconImageUrl: null, owned: false },
  ],
};

function renderNightView() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <NightView />
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('NightView', () => {
  it('renders items and the real balance from the backend', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 })));
    renderNightView();

    await waitFor(() => expect(screen.getByText('Atlas of Dermoscopy')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Shop for Items' })).toBeInTheDocument();
    expect(screen.getByText('$40')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // real money in the balance chip
    expect(screen.getByText('Handbook')).toBeInTheDocument(); // itemType label
  });

  it('selecting an item updates the cart total and clamps to the balance', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 })));
    renderNightView();
    await waitFor(() => screen.getByText('UV Meter'));

    await user.click(screen.getByRole('button', { name: /select UV Meter/i }));
    expect(screen.getByText(/1 item selected/i)).toBeInTheDocument();
    // Atlas (40) no longer fits in remaining 30 → its toggle is disabled
    expect(screen.getByRole('button', { name: /select Atlas of Dermoscopy/i })).toBeDisabled();
  });

  it('Buy commits the selection via POST and refreshes', async () => {
    const user = userEvent.setup();
    const posted = [];
    global.fetch = jest.fn().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = String(init?.method ?? (typeof input === 'object' ? input.method : 'GET') ?? 'GET').toUpperCase();
      if (url.endsWith('/api/v1/shop/purchase')) {
        posted.push({ url, method });
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 60 }, ownedItem: { id: 'x' } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
    });
    renderNightView();
    await waitFor(() => screen.getByText('Atlas of Dermoscopy'));

    await user.click(screen.getByRole('button', { name: /select Atlas of Dermoscopy/i }));
    await user.click(screen.getByRole('button', { name: /^buy/i }));
    await waitFor(() => expect(posted.length).toBe(1));
  });
});

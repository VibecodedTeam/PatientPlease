import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { NightShopProvider, useNightShop } from '../../../../../views/NightView/providers/NightShop';

const CATALOG = {
  money: 100,
  items: [
    { id: 'a', sku: 'A', name: 'Atlas', description: 'd', itemType: 'HANDBOOK', price: 40, unlockDay: null, iconImageUrl: null, owned: false },
    { id: 'b', sku: 'B', name: 'Scope', description: 'd', itemType: 'EQUIPMENT', price: 70, unlockDay: null, iconImageUrl: null, owned: false },
    { id: 'c', sku: 'C', name: 'Owned', description: 'd', itemType: 'HANDBOOK', price: 10, unlockDay: null, iconImageUrl: null, owned: true },
  ],
};

function Probe() {
  const s = useNightShop();
  if (s.isLoading) return <span>loading</span>;
  if (s.error) return <span>error</span>;
  return (
    <div>
      <span>money {s.money}</span>
      <span>total {s.selectedTotal}</span>
      <span>remaining {s.remaining}</span>
      {s.items.map((it) => (
        <button
          key={it.id}
          data-testid={`item-${it.id}`}
          disabled={!s.canToggle(it)}
          onClick={() => s.toggleItem(it)}
        >
          {it.name}
          {s.isSelected(it.id) ? ' selected' : ''}
        </button>
      ))}
      <button data-testid="buy" onClick={() => s.buySelected()}>buy</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <NightShopProvider>
          <Probe />
        </NightShopProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('NightShopProvider', () => {
  it('loads catalog + money from GET /api/v1/shop', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 })));
    renderProvider();
    await waitFor(() => expect(screen.getByText('money 100')).toBeInTheDocument());
    expect(screen.getByTestId('item-a')).toBeEnabled();
    expect(screen.getByTestId('item-c')).toBeDisabled(); // owned → cannot toggle
  });

  it('tracks total/remaining and blocks selection that would exceed the balance', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 })));
    renderProvider();
    await waitFor(() => screen.getByText('money 100'));

    await user.click(screen.getByTestId('item-b')); // 70 selected
    expect(screen.getByText('total 70')).toBeInTheDocument();
    expect(screen.getByText('remaining 30')).toBeInTheDocument();
    // 'a' costs 40 > remaining 30 → not selectable (won't go over / under)
    expect(screen.getByTestId('item-a')).toBeDisabled();
  });

  it('exposes an error when the catalog fetch fails', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(new Response('nope', { status: 500 })));
    renderProvider();
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });

  it('buySelected POSTs each selected item then refetches and clears selection', async () => {
    const user = userEvent.setup();
    const calls = [];
    let purchased = false;
    // axios's fetch adapter calls fetch(Request), so read url/method off the Request.
    global.fetch = jest.fn().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = String(init?.method ?? (typeof input === 'object' ? input.method : 'GET') ?? 'GET').toUpperCase();
      calls.push({ url, method });
      if (url.endsWith('/api/v1/shop/purchase')) {
        purchased = true;
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 60 }, ownedItem: { id: 'x' } }), { status: 200 }));
      }
      // GET /api/v1/shop — initial load has full money; the post-purchase refetch reflects the debit.
      const money = purchased ? 60 : 100;
      return Promise.resolve(new Response(JSON.stringify({ ...CATALOG, money }), { status: 200 }));
    });
    renderProvider();
    await waitFor(() => screen.getByText('money 100'));

    await user.click(screen.getByTestId('item-a')); // select a (40)
    await user.click(screen.getByTestId('buy'));

    await waitFor(() =>
      expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/api/v1/shop/purchase'))).toBe(true));
    await waitFor(() => expect(screen.getByText('total 0')).toBeInTheDocument()); // selection cleared after refetch
    await waitFor(() => expect(screen.getByText('money 60')).toBeInTheDocument());
  });

  it('reconciles selection against the reloaded catalog after a partial purchase failure', async () => {
    const user = userEvent.setup();
    const TWO_ITEMS = {
      money: 100,
      items: [
        { id: 'x', sku: 'X', name: 'ItemX', description: 'd', itemType: 'HANDBOOK', price: 40, unlockDay: null, iconImageUrl: null, owned: false },
        { id: 'y', sku: 'Y', name: 'ItemY', description: 'd', itemType: 'EQUIPMENT', price: 30, unlockDay: null, iconImageUrl: null, owned: false },
      ],
    };
    const purchases = [];
    let xOwned = false;
    global.fetch = jest.fn().mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/api/v1/shop/purchase')) {
        purchases.push(true);
        if (purchases.length === 2) {
          // The second purchase (item y) fails mid-loop.
          return Promise.resolve(new Response('boom', { status: 500 }));
        }
        // The first purchase (item x) succeeds and is now owned.
        xOwned = true;
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 60 }, ownedItem: { id: 'x' } }), { status: 200 }));
      }
      // GET /api/v1/shop reflects x's ownership + debited money once purchased.
      const items = TWO_ITEMS.items.map((it) => (it.id === 'x' ? { ...it, owned: xOwned } : it));
      return Promise.resolve(new Response(JSON.stringify({ money: xOwned ? 60 : 100, items }), { status: 200 }));
    });

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <NightShopProvider>
            <Probe />
          </NightShopProvider>
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => screen.getByText('money 100'));

    await user.click(screen.getByTestId('item-x'));
    await user.click(screen.getByTestId('item-y'));
    expect(screen.getByText('total 70')).toBeInTheDocument();

    await user.click(screen.getByTestId('buy'));

    // After the failure, the already-purchased x is dropped from the selection
    // (owned), leaving only the still-unowned y — total reflects y alone, not 70.
    await waitFor(() => expect(screen.getByText('total 30')).toBeInTheDocument());
    expect(screen.getByTestId('item-x')).toBeDisabled(); // owned → not selectable
    expect(purchases.length).toBe(2);

    // Retrying does NOT re-POST the already-owned x: exactly one more purchase call.
    await user.click(screen.getByTestId('buy'));
    await waitFor(() => expect(purchases.length).toBe(3));
    await waitFor(() => expect(screen.getByText('total 0')).toBeInTheDocument());
  });
});

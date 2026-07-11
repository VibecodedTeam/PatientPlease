import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider, useRound } from '../../../providers/Round';

const ROUND = {
  gameSession: { id: 'gs1', money: 100, status: 'ACTIVE' },
  ownedItems: [],
  case: { id: 'case-1', patient: { id: 'p1' }, documents: [] },
  diagnosisOptions: [],
  treatmentOptions: [],
};

function RoundConsumer() {
  const { round, isLoading, error, terminalState } = useRound();
  if (isLoading) return <span>loading</span>;
  if (terminalState) return <span>terminal: {terminalState}</span>;
  if (error) return <span>error: {error.message}</span>;
  return <span>case {round?.case?.id}</span>;
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <RoundConsumer />
      </RoundProvider>
    </ApiProvider>,
  );
}

function lastRequest() {
  return global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
}

describe('RoundProvider', () => {
  it('starts a round via POST /api/v1/round and exposes it via useRound', async () => {
    global.fetch = jest.fn().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = String(
        init?.method ?? (typeof input === 'object' ? input.method : 'GET') ?? 'GET',
      ).toUpperCase();
      expect(url.endsWith('/api/v1/round')).toBe(true);
      expect(method).toBe('POST');
      return Promise.resolve(new Response(JSON.stringify(ROUND), { status: 200 }));
    });

    renderProvider();

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('case case-1')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/round');
  });

  it('exposes an error via useRound when the round request fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    renderProvider();

    await waitFor(() => expect(screen.getByText(/^error:/)).toBeInTheDocument());
  });

  it.each(['game_completed', 'no_cases_remaining'])(
    'exposes terminalState "completed" when the round request returns 409 %s',
    async (code) => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: code }), { status: 409 }));

      renderProvider();

      await waitFor(() =>
        expect(screen.getByText('terminal: completed')).toBeInTheDocument(),
      );
    },
  );

  it('exposes terminalState "game_over" when the round request returns 409 game_over', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'game_over' }), { status: 409 }));

    renderProvider();

    await waitFor(() => expect(screen.getByText('terminal: game_over')).toBeInTheDocument());
  });

  it('pauseGame POSTs /api/v1/game/pause and updates round.gameSession', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ gameSession: { money: 100, status: 'PAUSED' } }), {
          status: 200,
        }),
      );
    });

    function Probe() {
      const { round, pauseGame } = useRound();
      return (
        <div>
          <span data-testid="status">{round?.gameSession?.status ?? 'none'}</span>
          <button onClick={() => pauseGame()}>pause</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('none'));

    await userEvent.setup().click(screen.getByText('pause'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('PAUSED'));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/game/pause');
  });

  it('resetDay POSTs /api/v1/day/reset and updates round.gameSession', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 })),
    );

    function Probe() {
      const { resetDay } = useRound();
      return <button onClick={() => resetDay()}>reset-day</button>;
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await userEvent.setup().click(screen.getByText('reset-day'));

    // 3 calls: the initial round-start, the reset itself, and the refetch
    // resetDay triggers afterward so the next case actually loads.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const resetRequest = global.fetch.mock.calls.map(([request]) => request).find(
      (request) => new URL(request.url).pathname === '/api/v1/day/reset',
    );
    expect(resetRequest.method).toBe('POST');
    const request = lastRequest();
    expect(request.url).toBe('http://api.test/api/v1/round');
  });

  it('resetGame POSTs /api/v1/game/reset and tolerates a null gameSession response', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ gameSession: null }), { status: 200 }));
    });

    function Probe() {
      const { resetGame } = useRound();
      return <button onClick={() => resetGame()}>reset-game</button>;
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await expect(userEvent.setup().click(screen.getByText('reset-game'))).resolves.not.toThrow();

    // 3 calls: the initial round-start, the reset itself, and the refetch
    // resetGame triggers afterward so the next case actually loads.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const resetRequest = global.fetch.mock.calls.map(([request]) => request).find(
      (request) => new URL(request.url).pathname === '/api/v1/game/reset',
    );
    expect(resetRequest).toBeDefined();
  });

  it('endDay POSTs /api/v1/day/end, returns the dayLog, and updates round.gameSession', async () => {
    const dayEndResponse = {
      gameSession: { money: 130, consecutiveBadDiagnosisCount: 0 },
      dayLog: { dayNumber: 3, startingMoney: 100, endingMoney: 130, casesAttempted: 2, casesCorrect: 2 },
    };
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(dayEndResponse), { status: 200 }));
    });

    function Probe() {
      const { round, endDay } = useRound();
      const [dayLog, setDayLog] = React.useState(null);
      return (
        <div>
          <span data-testid="money">{round?.gameSession?.money ?? 'none'}</span>
          <span data-testid="day-log">{dayLog ? JSON.stringify(dayLog) : 'none'}</span>
          <button onClick={() => endDay().then((data) => setDayLog(data.dayLog))}>end-day</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('100'));

    await userEvent.setup().click(screen.getByText('end-day'));

    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('130'));
    expect(screen.getByTestId('day-log').textContent).toBe(JSON.stringify(dayEndResponse.dayLog));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/day/end');
  });

  it('loadShopCatalog GETs /api/v1/shop and exposes the catalog via shopCatalog', async () => {
    const catalog = { money: 100, items: [{ id: 'a', name: 'Atlas', price: 40 }] };
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(catalog), { status: 200 }));
    });

    function Probe() {
      const { shopCatalog, isShopLoading, loadShopCatalog } = useRound();
      return (
        <div>
          <span data-testid="shop-loading">{String(isShopLoading)}</span>
          <span data-testid="shop-money">{shopCatalog ? shopCatalog.money : 'none'}</span>
          <button onClick={() => loadShopCatalog()}>load-shop</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('shop-money').textContent).toBe('none'));

    await userEvent.setup().click(screen.getByText('load-shop'));

    await waitFor(() => expect(screen.getByTestId('shop-money').textContent).toBe('100'));
    expect(screen.getByTestId('shop-loading').textContent).toBe('false');
    const request = lastRequest();
    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://api.test/api/v1/shop');
  });

  it('purchaseShopItem POSTs /api/v1/shop/purchase with the item id and updates round.gameSession', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ gameSession: { money: 60 }, ownedItem: { id: 'x' } }), { status: 200 }),
      );
    });

    function Probe() {
      const { round, purchaseShopItem } = useRound();
      return (
        <div>
          <span data-testid="money">{round?.gameSession?.money ?? 'none'}</span>
          <button onClick={() => purchaseShopItem('shop-item-1')}>buy</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('100'));

    await userEvent.setup().click(screen.getByText('buy'));

    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('60'));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/shop/purchase');
    expect(await request.clone().json()).toEqual({ shopItemId: 'shop-item-1' });
  });

  it('resetDay refetches the round so a new case replaces the old one', async () => {
    let roundCallCount = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        roundCallCount += 1;
        const caseId = roundCallCount === 1 ? 'case-old' : 'case-new';
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: { money: 100 }, case: { id: caseId } }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
    });

    function Probe() {
      const { round, resetDay } = useRound();
      return (
        <div>
          <span data-testid="case-id">{round?.case?.id ?? 'none'}</span>
          <button onClick={() => resetDay()}>reset-day</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-old'));

    await userEvent.setup().click(screen.getByText('reset-day'));

    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-new'));
  });

  it('exposes refreshRound() which re-fetches the round on demand', async () => {
    let roundCallCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      roundCallCount += 1;
      const caseId = roundCallCount === 1 ? 'case-a' : 'case-b';
      return Promise.resolve(
        new Response(JSON.stringify({ gameSession: { money: 100 }, case: { id: caseId } }), {
          status: 200,
        }),
      );
    });

    function Probe() {
      const { round, refreshRound } = useRound();
      return (
        <div>
          <span data-testid="case-id">{round?.case?.id ?? 'none'}</span>
          <button onClick={() => refreshRound()}>refresh</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-a'));

    await userEvent.setup().click(screen.getByText('refresh'));

    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-b'));
  });

  it('discards a stale refreshRound response when a newer call resolves first', async () => {
    let resolveFirstCall;
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirstCall = () =>
            resolve(
              new Response(JSON.stringify({ gameSession: { money: 100 }, case: { id: 'stale' } }), {
                status: 200,
              }),
            );
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ gameSession: { money: 100 }, case: { id: 'fresh' } }), {
          status: 200,
        }),
      );
    });

    function Probe() {
      const { round, refreshRound } = useRound();
      return (
        <div>
          <span data-testid="case-id">{round?.case?.id ?? 'none'}</span>
          <button onClick={() => refreshRound()}>refresh</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    // Mount effect fires call #1 (hangs). Trigger call #2 before #1 resolves.
    await userEvent.setup().click(screen.getByText('refresh'));

    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('fresh'));

    resolveFirstCall();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(screen.getByTestId('case-id').textContent).toBe('fresh');
  });

  it('loadShopCatalog discards a stale response when two calls overlap out of order', async () => {
    let shopCallCount = 0;
    let resolveFirstCall;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      shopCallCount += 1;
      if (shopCallCount === 1) {
        return new Promise((resolve) => {
          resolveFirstCall = () =>
            resolve(new Response(JSON.stringify({ money: 0, items: [{ id: 'stale' }] }), { status: 200 }));
        });
      }
      return Promise.resolve(new Response(JSON.stringify({ money: 999, items: [{ id: 'fresh' }] }), { status: 200 }));
    });

    function Probe() {
      const { shopCatalog, loadShopCatalog } = useRound();
      return (
        <div>
          <span data-testid="money">{shopCatalog?.money ?? 'none'}</span>
          <button onClick={() => loadShopCatalog()}>load</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('load')); // call #1: hangs
    await user.click(screen.getByText('load')); // call #2: resolves immediately with money:999

    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('999'));

    resolveFirstCall(); // call #1 finally resolves with the stale money:0
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(screen.getByTestId('money').textContent).toBe('999'); // must NOT regress to the stale value
  });
});

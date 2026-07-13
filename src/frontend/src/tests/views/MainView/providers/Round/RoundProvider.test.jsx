import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider, useRound } from '../../../../../views/MainView/providers/Round';

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
});

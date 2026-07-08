import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RoundProvider, useRound } from '../../../../../views/MainView/providers/Round';

function RoundConsumer() {
  const { round, isLoading, error } = useRound();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error: {error.message}</span>;
  return <span>day {round?.day}</span>;
}

describe('RoundProvider', () => {
  it('fetches the same-origin round mock and exposes it via useRound', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ day: 3 }), { status: 200 }));

    render(
      <RoundProvider>
        <RoundConsumer />
      </RoundProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('day 3')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('exposes an error via useRound when the fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    render(
      <RoundProvider>
        <RoundConsumer />
      </RoundProvider>,
    );

    await waitFor(() => expect(screen.getByText(/^error:/)).toBeInTheDocument());
  });
});

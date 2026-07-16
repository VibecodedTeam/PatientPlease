import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiProvider } from '../../../providers/Api';
import { AuthProvider } from '../../../providers/Auth';
import { StartView } from '../../../views/StartView';

function renderStartView() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <AuthProvider>
        <MemoryRouter>
          <StartView />
        </MemoryRouter>
      </AuthProvider>
    </ApiProvider>,
  );
}

function mockAuthStatus(authenticated) {
  global.fetch = jest.fn().mockResolvedValue(
    authenticated
      ? new Response(JSON.stringify({ user: { id: '1', name: 'Test User' } }), { status: 200 })
      : new Response('', { status: 401 }),
  );
}

describe('StartView', () => {
  it('renders the Patient Please splash', async () => {
    mockAuthStatus(false);
    renderStartView();

    expect(screen.getByText('Trwają przyjęcia')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pacjent.*proszę/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /graj/i })).toBeInTheDocument());
  });

  it('surfaces Google sign-in when clicking PLAY while unauthenticated', async () => {
    const user = userEvent.setup();
    mockAuthStatus(false);
    renderStartView();

    await waitFor(() => screen.getByRole('button', { name: /graj/i }));
    await user.click(screen.getByRole('button', { name: /graj/i }));

    expect(screen.getByRole('heading', { name: /zaloguj/i })).toBeInTheDocument();
  });

  it('does not surface Google sign-in when clicking PLAY while already authenticated', async () => {
    const user = userEvent.setup();
    mockAuthStatus(true);
    renderStartView();

    await waitFor(() => screen.getByRole('button', { name: /graj/i }));
    await user.click(screen.getByRole('button', { name: /graj/i }));

    expect(screen.queryByRole('heading', { name: /zaloguj/i })).not.toBeInTheDocument();
  });
});

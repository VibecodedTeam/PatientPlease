import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// This file avoids JSX everywhere (uses React.createElement instead): esbuild-jest
// routes any file containing "mock(" through an extra babel pass that strips the
// `React` import binding before esbuild's later JSX pass re-inserts bare
// `React.createElement` calls, causing a "React is not defined" crash.
//
// jsdom has no real WebGL context, so PatientScene (which drives a real Three.js
// WebGLRenderer) is stubbed here — this suite only cares about the Wall/Table
// content MainView renders alongside it, not the 3D scene itself.
jest.mock('../../../components/PatientScene', () => ({
  PatientScene: () => require('react').createElement('div', { 'data-testid': 'patient-scene' }),
  PatientSceneProvider: ({ children }) => children,
}));

const { MainView } = require('../../../views/MainView');
const { ApiProvider } = require('../../../providers/Api');

function renderMainView() {
  return render(
    React.createElement(ApiProvider, { baseUrl: 'http://api.test' }, React.createElement(MainView)),
  );
}

describe('MainView', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ case: { documents: [] } }), { status: 200 }),
    );
  });

  it('renders the wall with the pinned board', () => {
    renderMainView();
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
    expect(screen.getByText('Patients left today: 5')).toBeInTheDocument();
  });

  it('renders the patient documents desk', async () => {
    renderMainView();

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });

  it('shows a completion message instead of the desk when the game is finished', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'game_completed' }), { status: 409 }));

    renderMainView();

    await waitFor(() => expect(screen.getByText(/completed every case/i)).toBeInTheDocument());
    expect(screen.queryByText('Patient Information')).not.toBeInTheDocument();
  });

  it('shows a game-over message when the session is over', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'game_over' }), { status: 409 }));

    renderMainView();

    await waitFor(() => expect(screen.getByText(/game over/i)).toBeInTheDocument());
  });

  it('keeps chat messages after switching to the 3D view and back', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/v1/chat')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              chatMessages: [
                { id: 'm1', sender: 'PLAYER', content: 'How are you feeling?', sentAt: '2026-07-13T00:00:00.000Z', sortOrder: 1 },
                { id: 'm2', sender: 'PATIENT', content: 'A bit better today.', sentAt: '2026-07-13T00:00:01.000Z', sortOrder: 2 },
              ],
              revealedDocuments: [],
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ case: { documents: [] } }), { status: 200 }));
    });

    renderMainView();
    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^chat$/i }));
    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'How are you feeling?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('A bit better today.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /3d view/i }));
    await user.click(screen.getByRole('button', { name: /^chat$/i }));

    expect(screen.getByText('A bit better today.')).toBeInTheDocument();
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
  });
});

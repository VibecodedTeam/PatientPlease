import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

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
});

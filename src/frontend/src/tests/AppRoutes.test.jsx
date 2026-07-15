import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ApiProvider } from '../providers/Api';
import { AuthProvider } from '../providers/Auth';

// This file uses React.createElement instead of JSX: esbuild-jest routes any
// file containing a `jest.mock(` call through an extra babel pass that strips
// the `React` import binding before the JSX pass runs, which would crash JSX
// with "React is not defined". We need jest.mock below to stub the 3D scene.
//
// jsdom has no WebGL, so MainView's real Three.js PatientScene throws when the
// authenticated /game route mounts it. This is a routing test, not a 3D test.
jest.mock('../components/PatientScene', () => ({
  PatientScene: () => require('react').createElement('div', { 'data-testid': 'patient-scene' }),
  PatientSceneProvider: ({ children }) => children,
}));

const { AppRoutes } = require('../AppRoutes');

const h = React.createElement;

function LocationProbe() {
  const location = useLocation();
  return h('div', { 'data-testid': 'location' }, location.pathname);
}

// Fresh Response per call so multi-fetch renders (e.g. /auth/me + a view's
// own data fetch) each get a readable, un-consumed body.
function mockAuth(authenticated) {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve(
      authenticated
        ? new Response(JSON.stringify({ user: { id: '1', name: 'Test User' } }), { status: 200 })
        : new Response('', { status: 401 }),
    ),
  );
}

function renderAt(path) {
  return render(
    h(
      ApiProvider,
      { baseUrl: 'http://api.test' },
      h(
        AuthProvider,
        null,
        h(
          MemoryRouter,
          { initialEntries: [path] },
          h(AppRoutes, { googleClientId: 'test-client-id' }),
          h(LocationProbe),
        ),
      ),
    ),
  );
}

describe('AppRoutes', () => {
  it('renders the public StartView at / without requiring auth', async () => {
    mockAuth(false);
    renderAt('/');
    expect(screen.getByText('Now Admitting')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument(),
    );
  });

  it('blocks /game/night behind the auth gate when unauthenticated', async () => {
    mockAuth(false);
    renderAt('/game/night');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/shop for items/i)).not.toBeInTheDocument();
  });

  it('renders /game/night through the gate when authenticated', async () => {
    mockAuth(true);
    renderAt('/game/night');
    await waitFor(() => expect(screen.getByText(/shop for items/i)).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('redirects /game to /game/main when authenticated', async () => {
    mockAuth(true);
    renderAt('/game');
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/game/main'),
    );
  });
});

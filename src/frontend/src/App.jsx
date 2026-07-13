import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from './providers/Api';
import { AuthProvider } from './providers/Auth';
import { AppRoutes } from './AppRoutes';
import { Music } from './components/Music';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
}

export default function App() {
  return (
    <ApiProvider baseUrl={API_BASE_URL}>
      <AuthProvider>
        <Music />
        <BrowserRouter>
          <AppRoutes googleClientId={GOOGLE_CLIENT_ID} />
        </BrowserRouter>
      </AuthProvider>
    </ApiProvider>
  );
}

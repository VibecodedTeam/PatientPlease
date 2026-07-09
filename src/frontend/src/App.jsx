import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApiProvider } from './providers/Api';
import { AuthProvider } from './providers/Auth';
import { AuthGate } from './components/AuthGate';
import { MainView } from './views/MainView';
import { NightView } from './views/NightView';
import { StartView } from './views/StartView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
}

export default function App() {
  return (
    <ApiProvider baseUrl={API_BASE_URL}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<StartView />} />
            <Route
              path="/game/*"
              element={
                <AuthGate googleClientId={GOOGLE_CLIENT_ID}>
                  <Routes>
                    <Route index element={<Navigate to="main" replace />} />
                    <Route path="main" element={<MainView />} />
                    <Route path="night" element={<NightView />} />
                  </Routes>
                </AuthGate>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApiProvider>
  );
}

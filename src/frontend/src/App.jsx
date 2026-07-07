import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApiProvider } from './providers/Api';
import { AuthProvider } from './providers/Auth';
import { AuthGate } from '../components/AuthGate';
import { MainView } from '../views/MainView';
import { NightView } from '../views/NightView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  return (
    <ApiProvider baseUrl={API_BASE_URL}>
      <AuthProvider>
        <AuthGate googleClientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainView />} />
              <Route path="/night" element={<NightView />} />
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </ApiProvider>
  );
}

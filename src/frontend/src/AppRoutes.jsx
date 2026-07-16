import React from 'react';
import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { RoundProvider } from './providers/Round';
import { MainView } from './views/MainView';
import { MinigameView } from './views/MinigameView';
import { NightView } from './views/NightView';
import { StartView } from './views/StartView';

export function AppRoutes({ googleClientId }) {
  return (
    <Routes>
      <Route path="/" element={<StartView />} />
      <Route
        path="/game/*"
        element={
          <AuthGate googleClientId={googleClientId}>
            <RoundProvider>
              <Routes>
                <Route index element={<Navigate to="main" replace />} />
                <Route path="main" element={<MainView />} />
                <Route path="main/minigame" element={<MinigameView />} />
                <Route path="night" element={<NightView />} />
              </Routes>
            </RoundProvider>
          </AuthGate>
        }
      />
    </Routes>
  );
}

AppRoutes.propTypes = {
  googleClientId: PropTypes.string.isRequired,
};

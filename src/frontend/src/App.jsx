import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainView } from '../views/MainView';
import { NightView } from '../views/NightView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/night" element={<NightView />} />
      </Routes>
    </BrowserRouter>
  );
}

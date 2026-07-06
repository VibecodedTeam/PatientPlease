import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainView } from '../views/MainView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainView />} />
      </Routes>
    </BrowserRouter>
  );
}

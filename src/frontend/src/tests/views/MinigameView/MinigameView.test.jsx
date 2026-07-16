import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MinigameView } from '../../../views/MinigameView';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/game/main/minigame" element={<MinigameView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MinigameView', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders the Excisio minigame', () => {
    renderAt('/game/main/minigame?shopItemId=exam-1&caseId=case-1');

    expect(screen.getByRole('heading', { name: /technika biopsji wycinającej/i })).toBeInTheDocument();
  });
});

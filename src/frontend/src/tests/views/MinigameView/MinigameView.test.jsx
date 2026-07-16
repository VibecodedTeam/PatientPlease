import React from 'react';
import { render, screen } from '@testing-library/react';
import { MinigameView } from '../../../views/MinigameView';

describe('MinigameView', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders the Excisio minigame', () => {
    render(<MinigameView />);

    expect(screen.getByRole('heading', { name: /technika biopsji wycinającej/i })).toBeInTheDocument();
  });
});

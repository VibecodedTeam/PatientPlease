import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartView } from '../../../views/StartView';

describe('StartView', () => {
  it('renders the skin-cancer-awareness headline and the ABCDE self-check', () => {
    render(<StartView />);
    expect(screen.getByRole('heading', { name: /know your skin/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The ABCDE rule' })).toBeInTheDocument();
  });

  it('renders a call-to-action linking out to find a dermatologist', () => {
    render(<StartView />);
    expect(screen.getByRole('button', { name: 'Find a dermatologist' })).toBeInTheDocument();
  });

  it('toggles the awareness video caption when the play button is pressed', async () => {
    const user = userEvent.setup();
    render(<StartView />);
    const playButton = screen.getByRole('button', { name: 'Play awareness video' });
    await user.click(playButton);
    expect(screen.getByRole('button', { name: 'Pause awareness video' })).toBeInTheDocument();
  });
});

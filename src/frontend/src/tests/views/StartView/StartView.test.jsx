import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartView } from '../../../views/StartView';

describe('StartView', () => {
  it('renders the awareness headline and ABCDE checklist', () => {
    render(<StartView />);
    expect(screen.getByText(/Know your skin\./)).toBeInTheDocument();
    expect(screen.getByText('Asymmetry')).toBeInTheDocument();
    expect(screen.getByText('Border')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Diameter')).toBeInTheDocument();
    expect(screen.getByText('Evolving')).toBeInTheDocument();
  });

  it('toggles the play button and shows a caption while playing', async () => {
    const user = userEvent.setup();
    render(<StartView />);

    const playButton = screen.getByRole('button', { name: /play awareness video/i });
    expect(playButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(playButton);

    expect(screen.getByRole('button', { name: /pause awareness video/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

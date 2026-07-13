import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chat } from '../../../components/Chat';

describe('Chat', () => {
  it('renders a patient portrait chosen from the known portrait set', () => {
    render(<Chat />);
    const portrait = screen.getByAltText(/patient portrait/i);
    expect(portrait.getAttribute('src')).toMatch(/^\/patient-portraits\/.+\.png$/);
  });

  it('shows an opening patient message', () => {
    render(<Chat />);
    expect(screen.getByText(/chest/i)).toBeInTheDocument();
  });

  it('lets the doctor send a message and appends a patient reply', async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const input = screen.getByLabelText(/doctor reply/i);
    await user.type(input, 'How long have you had this pain?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText('How long have you had this pain?')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });
});

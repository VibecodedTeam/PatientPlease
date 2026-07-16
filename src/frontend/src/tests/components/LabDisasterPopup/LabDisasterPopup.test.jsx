import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LabDisasterPopup } from '../../../components/LabDisasterPopup';

describe('LabDisasterPopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('shows the lab disaster message', () => {
    render(<LabDisasterPopup onClose={jest.fn()} />);

    expect(screen.getByText('Katastrofa laboratoryjna')).toBeInTheDocument();
    expect(screen.getByText(/nie są dostępne/i)).toBeInTheDocument();
  });

  it('calls onClose when Continue is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<LabDisasterPopup onClose={onClose} />);

    await user.click(screen.getByText('Kontynuuj'));

    expect(onClose).toHaveBeenCalled();
  });
});

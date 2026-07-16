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

    expect(screen.getByText('Lab Disaster')).toBeInTheDocument();
    expect(screen.getByText(/no results are available/i)).toBeInTheDocument();
  });

  it('calls onClose when Continue is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<LabDisasterPopup onClose={onClose} />);

    await user.click(screen.getByText('Continue'));

    expect(onClose).toHaveBeenCalled();
  });
});

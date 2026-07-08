import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MelanomaImagePopup } from '../../../components/MelanomaImagePopup';

describe('MelanomaImagePopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders a random melanoma image', () => {
    render(<MelanomaImagePopup onClose={() => {}} />);

    const image = screen.getByRole('img');
    expect(image.getAttribute('src')).toMatch(/^\/melanoma\/.+\.jpg$/);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<MelanomaImagePopup onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop (outside the popup box) is clicked', () => {
    const onClose = jest.fn();
    render(<MelanomaImagePopup onClose={onClose} />);

    fireEvent.click(screen.getByTestId('melanoma-popup-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the popup box itself is clicked', () => {
    const onClose = jest.fn();
    render(<MelanomaImagePopup onClose={onClose} />);

    fireEvent.click(screen.getByTestId('melanoma-popup-box'));

    expect(onClose).not.toHaveBeenCalled();
  });
});

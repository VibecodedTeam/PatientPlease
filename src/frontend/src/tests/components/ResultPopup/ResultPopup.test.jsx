import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultPopup } from '../../../components/ResultPopup';

describe('ResultPopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('shows a correct verdict with the money earned', () => {
    render(<ResultPopup isCorrect moneyDelta={50} onClose={() => {}} />);

    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText('+$50')).toBeInTheDocument();
  });

  it('shows an incorrect verdict with the money lost', () => {
    render(<ResultPopup isCorrect={false} moneyDelta={-20} onClose={() => {}} />);

    expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
    expect(screen.getByText('-$20')).toBeInTheDocument();
  });

  it('shows a negative sign for an incorrect verdict even when the penalty is zero', () => {
    render(<ResultPopup isCorrect={false} moneyDelta={-0} onClose={() => {}} />);

    expect(screen.getByText('-$0')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<ResultPopup isCorrect moneyDelta={50} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the backdrop is clicked — only Continue should advance to the next case', () => {
    const onClose = jest.fn();
    render(<ResultPopup isCorrect moneyDelta={50} onClose={onClose} />);

    fireEvent.click(document.getElementById('overlay-root').firstChild);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when Escape is pressed — only Continue should advance to the next case', () => {
    const onClose = jest.fn();
    render(<ResultPopup isCorrect moneyDelta={50} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});

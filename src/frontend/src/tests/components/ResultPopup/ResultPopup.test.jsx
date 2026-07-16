import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultPopup } from '../../../components/ResultPopup';

describe('ResultPopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('shows a correct verdict with the money earned', () => {
    render(<ResultPopup isCorrect moneyDelta={50} onClose={() => {}} />);

    expect(screen.getByText(/poprawnie/i)).toBeInTheDocument();
    expect(screen.getByText('+$50')).toBeInTheDocument();
  });

  it('shows an incorrect verdict with the money lost', () => {
    render(<ResultPopup isCorrect={false} moneyDelta={-20} onClose={() => {}} />);

    expect(screen.getByText(/niepoprawnie/i)).toBeInTheDocument();
    expect(screen.getByText('-$20')).toBeInTheDocument();
  });

  it('shows a negative sign for an incorrect verdict even when the penalty is zero', () => {
    render(<ResultPopup isCorrect={false} moneyDelta={-0} onClose={() => {}} />);

    expect(screen.getByText('-$0')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<ResultPopup isCorrect moneyDelta={50} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /dalej/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the examine time and full balance when provided', () => {
    render(
      <ResultPopup
        isCorrect
        moneyDelta={75}
        examineSeconds={42}
        balance={275}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('+$75')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element.textContent === 'Czas badania: 0:42')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element.textContent === 'Saldo: $275')).toBeInTheDocument();
  });
});

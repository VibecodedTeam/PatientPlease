import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatisticsPopup } from '../../../components/StatisticsPopup';

const STATISTICS = {
  dayNumber: 3,
  casesAttempted: 4,
  casesCorrect: 3,
  moneyEarned: 150,
  endingMoney: 250,
  elapsedMs: 65000,
};

describe('StatisticsPopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('shows the Daily Statistics title, correct/attempted count, signed money earned, ending balance, and day time', () => {
    render(<StatisticsPopup statistics={STATISTICS} onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Statystyki dnia' })).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('+$150')).toBeInTheDocument();
    expect(screen.getByText('$250')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('shows a negative sign for a net loss', () => {
    render(
      <StatisticsPopup
        statistics={{ ...STATISTICS, moneyEarned: -40, endingMoney: 60 }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('-$40')).toBeInTheDocument();
  });

  it('calls onClose exactly once when the continue button is clicked', () => {
    const onClose = jest.fn();
    render(<StatisticsPopup statistics={STATISTICS} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /dalej/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the backdrop is clicked — only Continue should advance to night', () => {
    const onClose = jest.fn();
    render(<StatisticsPopup statistics={STATISTICS} onClose={onClose} />);

    fireEvent.click(document.getElementById('overlay-root').firstChild);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when Escape is pressed — only Continue should advance to night', () => {
    const onClose = jest.fn();
    render(<StatisticsPopup statistics={STATISTICS} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});

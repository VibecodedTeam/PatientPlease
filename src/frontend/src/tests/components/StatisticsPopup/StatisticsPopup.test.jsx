import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatisticsPopup } from '../../../components/StatisticsPopup';

const STATISTICS = {
  dayNumber: 3,
  startingMoney: 100,
  endingMoney: 130,
  casesAttempted: 2,
  casesCorrect: 2,
  moneyMade: 30,
  moneyLost: 0,
};

describe('StatisticsPopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('shows the Daily Statistics title, money made/lost boxes, and the ending money sum', () => {
    render(<StatisticsPopup statistics={STATISTICS} onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Daily Statistics' })).toBeInTheDocument();
    expect(screen.getByText('Money Made')).toBeInTheDocument();
    expect(screen.getByText('$30')).toBeInTheDocument();
    expect(screen.getByText('Money Lost')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('Ending Money')).toBeInTheDocument();
    expect(screen.getByText('$130')).toBeInTheDocument();
  });

  it('calls onClose exactly once when the continue button is clicked', () => {
    const onClose = jest.fn();
    render(<StatisticsPopup statistics={STATISTICS} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

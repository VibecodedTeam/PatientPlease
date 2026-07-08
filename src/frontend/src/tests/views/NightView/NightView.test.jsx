import React from 'react';
import { render, screen } from '@testing-library/react';
import { NightView } from '../../../views/NightView';

describe('NightView', () => {
  it('renders the shop', () => {
    render(<NightView />);
    expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NightView } from '../../../views/NightView';

describe('NightView', () => {
  it('renders the shop heading and balance', () => {
    render(<NightView />);
    expect(screen.getByRole('heading', { name: 'Shop for Items' })).toBeInTheDocument();
    expect(screen.getByText('End of shift')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders the hardcoded catalog', () => {
    render(<NightView />);
    expect(screen.getByText('Atlas of Dermoscopy')).toBeInTheDocument();
    expect(screen.getByText('$45')).toBeInTheDocument();
    expect(screen.getByText('Clinical Guide to Skin Cancer')).toBeInTheDocument();
    expect(screen.getByText('$60')).toBeInTheDocument();
    expect(screen.getByText('Sun & Skin: UV Exposure Manual')).toBeInTheDocument();
    expect(screen.getByText('$80')).toBeInTheDocument();
  });

  it('renders the cart summary with nothing selected', () => {
    render(<NightView />);
    expect(screen.getByText('No items selected')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });
});

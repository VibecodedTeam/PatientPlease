import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainView } from './MainView';

describe('MainView', () => {
  it('renders the wall with the pinned board', () => {
    render(<MainView />);
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
    expect(screen.getByText('Patients left today: 5')).toBeInTheDocument();
  });
});

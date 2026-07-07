import React from 'react';
import { render, screen } from '@testing-library/react';
import { NightView } from '../../../../src/views/NightView';

describe('NightView', () => {
  it('renders', () => {
    render(<NightView />);
    expect(screen.getByText('Night View')).toBeInTheDocument();
  });
});

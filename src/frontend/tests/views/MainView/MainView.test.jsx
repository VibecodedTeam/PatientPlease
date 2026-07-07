import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainView } from '../../../views/MainView';

describe('MainView', () => {
  it('renders', () => {
    render(<MainView />);
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });
});

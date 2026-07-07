import React from 'react';
import { render, screen } from '@testing-library/react';
import { PatientViewer } from './PatientViewer';

describe('PatientViewer', () => {
  it('renders a container for the 3D viewer', () => {
    render(<PatientViewer />);
    const container = screen.getByTestId('patient-viewer-container');
    expect(container).toBeInTheDocument();
  });
});
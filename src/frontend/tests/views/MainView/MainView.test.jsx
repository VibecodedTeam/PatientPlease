import React from 'react';
import { render, screen } from '@testing-library/react';

// This file avoids JSX everywhere (uses React.createElement instead): esbuild-jest
// routes any file containing "mock(" through an extra babel pass that strips the
// `React` import binding before esbuild's later JSX pass re-inserts bare
// `React.createElement` calls, causing a "React is not defined" crash.
jest.mock('../../../components/PatientViewer', () => ({
  PatientViewer: () => require('react').createElement('div', { 'data-testid': 'patient-viewer' }),
}));

const { MainView } = require('../../../views/MainView');

describe('MainView', () => {
  it('renders', () => {
    render(React.createElement(MainView));
    expect(screen.getByText('Main View')).toBeInTheDocument();
  });

  it('renders the patient viewer panel', () => {
    render(React.createElement(MainView));
    expect(screen.getByTestId('patient-viewer')).toBeInTheDocument();
  });
});

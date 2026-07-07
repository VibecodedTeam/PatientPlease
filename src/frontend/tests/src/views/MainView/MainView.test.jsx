import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MainView } from '../../../../src/views/MainView';

describe('MainView', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ case: { documents: [] } }), { status: 200 }),
    );
  });

  it('renders the wall with the pinned board', () => {
    render(<MainView />);
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
    expect(screen.getByText('Patients left today: 5')).toBeInTheDocument();
  });

  it('renders the patient documents desk', async () => {
    render(<MainView />);

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
  });
});

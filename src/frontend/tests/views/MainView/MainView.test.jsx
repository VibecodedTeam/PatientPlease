import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MainView } from '../../../views/MainView';

describe('MainView', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ case: { documents: [] } }), { status: 200 }),
    );
  });

  it('renders the patient documents desk', async () => {
    render(<MainView />);

    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());
  });
});

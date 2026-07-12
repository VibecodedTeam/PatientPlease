import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phone } from '../../../components/Phone';

describe('Phone', () => {
  it('renders the order-tests form with the available catalog', () => {
    render(<Phone onCancel={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Zleć badania' })).toBeInTheDocument();
    expect(screen.getByText('Dermatoskopia cyfrowa')).toBeInTheDocument();
    expect(screen.getByText('Biopsja zmiany skórnej')).toBeInTheDocument();
    expect(screen.getByText('Badania krwi')).toBeInTheDocument();
    expect(screen.getByText('USG węzłów chłonnych')).toBeInTheDocument();
  });

  it('marks unavailable tests and prevents selecting them', async () => {
    const user = userEvent.setup();
    render(<Phone onCancel={jest.fn()} />);

    expect(screen.getAllByText('Niedostępne')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /konsultacja onkologiczna/i }));

    expect(screen.getByText('Nie wybrano badań')).toBeInTheDocument();
  });

  it('starts with nothing selected and Confirm disabled', () => {
    render(<Phone onCancel={jest.fn()} />);

    expect(screen.getByText('Nie wybrano badań')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zleć badania' })).toBeDisabled();
  });

  it('selecting available tests updates the count/time and enables the confirm button', async () => {
    const user = userEvent.setup();
    render(<Phone onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /dermatoskopia cyfrowa/i }));

    expect(screen.getByText('1 badanie wybrane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zleć badania (1)' })).toBeEnabled();
  });

  it('confirming shows the success state with the ordered tests', async () => {
    const user = userEvent.setup();
    render(<Phone onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /dermatoskopia cyfrowa/i }));
    await user.click(screen.getByRole('button', { name: 'Zleć badania (1)' }));

    expect(screen.getByText('Badania zlecone')).toBeInTheDocument();
    expect(screen.getByText('Zleć kolejne')).toBeInTheDocument();
  });

  it('calls onCancel when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<Phone onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Anuluj is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<Phone onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Zamknij is clicked after ordering', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    const user2 = userEvent.setup();
    render(<Phone onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /dermatoskopia cyfrowa/i }));
    await user.click(screen.getByRole('button', { name: 'Zleć badania (1)' }));
    await user2.click(screen.getByRole('button', { name: 'Zamknij' }));

    expect(onCancel).toHaveBeenCalled();
  });
});

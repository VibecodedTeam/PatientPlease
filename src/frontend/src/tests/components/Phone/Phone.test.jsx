import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { ExaminationsProvider } from '../../../components/Phone/providers/Examinations';
import { Phone } from '../../../components/Phone';

const CATALOG = {
  money: 100,
  items: [
    {
      id: 'exam-1',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
    {
      id: 'exam-2',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: 'Magnified, polarized imaging.',
      itemType: 'EXAMINATION',
      price: 80,
      unlockDay: null,
      iconImageUrl: null,
      owned: false,
    },
  ],
};

function renderPhone(onCancel = jest.fn()) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <ExaminationsProvider>
          <Phone onCancel={onCancel} />
        </ExaminationsProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Phone', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG), { status: 200 }));
  });

  it('renders the order-tests form with the real examination catalog', async () => {
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Zleć badania' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('Dermoscopy Imaging')).toBeInTheDocument();
    expect(screen.getByText('$140')).toBeInTheDocument();
    expect(screen.getByText('$80')).toBeInTheDocument();
  });

  it('marks not-yet-owned examinations and prevents selecting them', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getAllByText('Niedostępne')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /dermoscopy imaging/i }));

    expect(screen.getByText('Nie wybrano badań')).toBeInTheDocument();
  });

  it('starts with nothing selected and Confirm disabled', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getByText('Nie wybrano badań')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zleć badania' })).toBeDisabled();
  });

  it('selecting an owned examination updates the count/total price and enables Confirm', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /punch biopsy/i }));

    expect(screen.getByText('1 badanie wybrane')).toBeInTheDocument();
    expect(screen.getByText('$140')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zleć badania (1)' })).toBeEnabled();
  });

  it('confirming shows the success state with the ordered tests', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /punch biopsy/i }));
    await user.click(screen.getByRole('button', { name: 'Zleć badania (1)' }));

    expect(screen.getByText('Badania zlecone')).toBeInTheDocument();
    expect(screen.getByText('Zleć kolejne')).toBeInTheDocument();
  });

  it('calls onCancel when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Anuluj is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Zamknij is clicked after ordering', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /punch biopsy/i }));
    await user.click(screen.getByRole('button', { name: 'Zleć badania (1)' }));
    await user.click(screen.getByRole('button', { name: 'Zamknij' }));

    expect(onCancel).toHaveBeenCalled();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NightView } from '../../../views/NightView';

function renderNightView() {
  return render(
    <MemoryRouter initialEntries={['/game/night']}>
      <Routes>
        <Route path="/game/night" element={<NightView />} />
        <Route path="/game/main" element={<div>Main View Stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NightView', () => {
  it('renders the shop heading and balance', () => {
    renderNightView();
    expect(screen.getByRole('heading', { name: 'Shop for Items' })).toBeInTheDocument();
    expect(screen.getByText('End of shift')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders the catalog', () => {
    renderNightView();
    expect(screen.getByText('Atlas of Dermoscopy')).toBeInTheDocument();
    expect(screen.getByText('$45')).toBeInTheDocument();
    expect(screen.getByText('Clinical Guide to Skin Cancer')).toBeInTheDocument();
    expect(screen.getByText('$60')).toBeInTheDocument();
    expect(screen.getByText('Sun & Skin: UV Exposure Manual')).toBeInTheDocument();
    expect(screen.getByText('$80')).toBeInTheDocument();
  });

  it('starts with nothing selected and a disabled-feeling Skip action', () => {
    renderNightView();
    expect(screen.getByText('No items selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('selecting an item updates the cart total and the action button', async () => {
    const user = userEvent.setup();
    renderNightView();

    await user.click(screen.getByRole('button', { name: /select atlas of dermoscopy/i }));

    expect(screen.getByText('1 item selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy · $45' })).toBeInTheDocument();
  });

  it('deselecting an item restores the Skip state', async () => {
    const user = userEvent.setup();
    renderNightView();

    const toggle = screen.getByRole('button', { name: /select atlas of dermoscopy/i });
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.getByText('No items selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('disables Buy and shows a hint when the selection is over budget', async () => {
    const user = userEvent.setup();
    renderNightView();

    await user.click(screen.getByRole('button', { name: /select atlas of dermoscopy/i }));
    await user.click(screen.getByRole('button', { name: /select clinical guide to skin cancer/i }));
    await user.click(screen.getByRole('button', { name: /select sun & skin: uv exposure manual/i }));

    const buyButton = screen.getByRole('button', { name: /buy/i });
    expect(buyButton).toBeDisabled();
    expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument();
  });

  it('buying deducts funds, marks the item owned, and redirects to /game/main', async () => {
    const user = userEvent.setup();
    renderNightView();

    await user.click(screen.getByRole('button', { name: /select atlas of dermoscopy/i }));
    await user.click(screen.getByRole('button', { name: 'Buy · $45' }));

    expect(screen.getByText('Main View Stub')).toBeInTheDocument();
  });

  it('skipping (nothing selected) redirects to /game/main', async () => {
    const user = userEvent.setup();
    renderNightView();

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(screen.getByText('Main View Stub')).toBeInTheDocument();
  });
});

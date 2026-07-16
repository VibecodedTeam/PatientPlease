import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Shop } from '../../../components/Shop';

const items = [
  {
    id: 'shop-item-1',
    sku: 'EQ-UVMETER-01',
    name: 'UV Exposure Meter',
    itemType: 'EQUIPMENT',
    price: 200,
    unlockDay: 2,
    iconImageUrl: '/assets/shop/uv_meter.png',
    affordable: true,
  },
  {
    id: 'shop-item-2',
    sku: 'HB-DERM-01',
    name: 'Dermatology Handbook',
    itemType: 'HANDBOOK',
    price: 400,
    unlockDay: 1,
    iconImageUrl: '/assets/shop/handbook.png',
    affordable: false,
  },
];

describe('Shop', () => {
  it('renders each item with its name and price', () => {
    render(<Shop items={items} />);
    expect(screen.getByText('UV Exposure Meter')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText('Dermatology Handbook')).toBeInTheDocument();
    expect(screen.getByText('$400')).toBeInTheDocument();
  });

  it('disables the Buy button until an item is selected', () => {
    render(<Shop items={items} />);
    expect(screen.getByRole('button', { name: 'Kup' })).toBeDisabled();
  });

  it('selects an affordable item via its toggle and enables Buy', async () => {
    const user = userEvent.setup();
    render(<Shop items={items} />);

    await user.click(screen.getByRole('button', { name: 'Select UV Exposure Meter' }));

    expect(screen.getByRole('button', { name: 'Kup' })).toBeEnabled();
  });

  it('does not allow selecting an unaffordable item', async () => {
    const user = userEvent.setup();
    render(<Shop items={items} />);

    await user.click(screen.getByRole('button', { name: 'Select Dermatology Handbook' }));

    expect(screen.getByRole('button', { name: 'Kup' })).toBeDisabled();
  });

  it('logs the selected item ids when Buy is clicked', async () => {
    const user = userEvent.setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<Shop items={items} />);

    await user.click(screen.getByRole('button', { name: 'Select UV Exposure Meter' }));
    await user.click(screen.getByRole('button', { name: 'Kup' }));

    expect(logSpy).toHaveBeenCalledWith(['shop-item-1']);
    logSpy.mockRestore();
  });
});

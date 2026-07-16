import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import { WallInventoryProvider, useWallInventory } from '../../../../../components/Wall/providers/WallInventory';

function ItemsConsumer() {
  const { items, isLoading } = useWallInventory();
  if (isLoading) return <span>loading</span>;
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.title} - {item.category} - {item.description}
        </li>
      ))}
    </ul>
  );
}

const OWNED_ITEMS = [
  {
    id: 'owned-1',
    shopItem: {
      id: 'shop-book-1',
      sku: 'BOOK_DERMA_101',
      name: 'Dermatology Handbook',
      description: 'A guide to common skin conditions.',
      itemType: 'HANDBOOK',
      iconImageUrl: '/icons/book.png',
    },
    purchasePrice: 50,
    purchasedOnDay: 1,
    purchasedAt: '2026-07-01T00:00:00.000Z',
    isEquipped: false,
  },
  {
    id: 'owned-2',
    shopItem: {
      id: 'shop-equip-1',
      sku: 'EQUIP_DERMASCOPE',
      name: 'Dermatoscope',
      description: 'Magnifies lesions for closer inspection.',
      itemType: 'EQUIPMENT',
      iconImageUrl: '/icons/equip.png',
    },
    purchasePrice: 200,
    purchasedOnDay: 1,
    purchasedAt: '2026-07-01T00:00:00.000Z',
    isEquipped: true,
  },
  {
    id: 'owned-3',
    shopItem: {
      id: 'shop-exam-1',
      sku: 'EXAM_BIOPSY',
      name: 'Biopsy',
      description: 'Lab-analyzed tissue sample.',
      itemType: 'EXAMINATION',
      iconImageUrl: '/icons/exam.png',
    },
    purchasePrice: 100,
    purchasedOnDay: 1,
    purchasedAt: '2026-07-01T00:00:00.000Z',
    isEquipped: false,
  },
];

describe('WallInventoryProvider', () => {
  it('narrows RoundProvider ownedItems down to HANDBOOK and EQUIPMENT items', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          gameSession: { id: 'session-1' },
          case: { documents: [] },
          diagnosisOptions: [],
          treatmentOptions: [],
          ownedItems: OWNED_ITEMS,
        }),
        { status: 200 },
      ),
    );

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <WallInventoryProvider>
            <ItemsConsumer />
          </WallInventoryProvider>
        </RoundProvider>
      </ApiProvider>,
    );

    expect(await screen.findByText('Dermatology Handbook - Podręcznik - A guide to common skin conditions.')).toBeInTheDocument();
    expect(screen.getByText('Dermatoscope - Sprzęt - Magnifies lesions for closer inspection.')).toBeInTheDocument();
    expect(screen.queryByText(/Biopsy/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

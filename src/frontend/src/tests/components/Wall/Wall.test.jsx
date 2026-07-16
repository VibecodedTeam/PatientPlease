import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Wall } from '../../../components/Wall';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { GameSessionProvider } from '../../../views/MainView/providers/GameSession';

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
];

/**
 * Mocks every fetch call (RoundProvider's mount-time refreshRound() and
 * ExaminationsProvider's loadShopCatalog(), once the order-tests modal opens)
 * with a fresh Response carrying the given ownedItems, so useWallInventory()
 * narrows real backend-shaped data down to the wall's shelf items.
 */
function mockRoundFetch(ownedItems) {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          gameSession: { id: 'session-1' },
          case: { documents: [] },
          diagnosisOptions: [],
          treatmentOptions: [],
          ownedItems,
        }),
        { status: 200 },
      ),
    ),
  );
}

function renderWithProviders(ui) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>{ui}</GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Wall', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders the doctor office wall', async () => {
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);
    expect(await screen.findByRole('region', { name: /ściana gabinetu/i })).toBeInTheDocument();
  });

  it('shows the hardcoded ABCDE mole-check board on the wall', async () => {
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);
    expect(
      await screen.findByRole('button', { name: /open the abcde mole self-check/i }),
    ).toBeInTheDocument();
  });

  it('renders the titles of the owned handbooks and equipment from useWallInventory', async () => {
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);

    expect(await screen.findByRole('button', { name: 'Dermatology Handbook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dermatoscope' })).toBeInTheDocument();
  });

  it('opens a details popup with the real category/description and no invented hint', async () => {
    const user = userEvent.setup();
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);

    const bookButton = await screen.findByRole('button', { name: 'Dermatology Handbook' });
    await user.click(bookButton);

    const popup = screen.getByRole('dialog', { name: /dermatology handbook/i });
    expect(popup).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dermatology Handbook' })).toBeInTheDocument();
    expect(screen.getByText('Podręcznik')).toBeInTheDocument();
    expect(screen.getByText('A guide to common skin conditions.')).toBeInTheDocument();
    expect(screen.queryByText(/medical hint/i)).not.toBeInTheDocument();
    expect(bookButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /zamknij/i }));
    expect(screen.queryByRole('dialog', { name: /dermatology handbook/i })).not.toBeInTheDocument();
    expect(bookButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an empty shelf message when there are no owned items', async () => {
    mockRoundFetch([]);
    renderWithProviders(<Wall />);

    expect(await screen.findByText(/nie kupiono jeszcze żadnych podręczników/i)).toBeInTheDocument();
    expect(screen.getByText(/odwiedź nocny sklep/i)).toBeInTheDocument();
  });

  it('still shows the desk lamp and dermatoscope wall fixtures when there are no owned items', async () => {
    mockRoundFetch([]);
    renderWithProviders(<Wall />);

    await screen.findByText(/nie kupiono jeszcze żadnych podręczników/i);
    expect(screen.getByRole('button', { name: /przełącz lampkę biurkową/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /przełącz dermatoskop/i })).toBeInTheDocument();
  });

  it('opens and closes the order-tests popup from the gear button', async () => {
    const user = userEvent.setup();
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);

    await screen.findByRole('button', { name: 'Dermatology Handbook' });
    expect(screen.queryByRole('dialog', { name: /zleć badania/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /otwórz zlecenia badań/i }));
    expect(screen.getByRole('dialog', { name: /zleć badania/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Zleć badania laboratoryjne' })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole('button', { name: /^zamknij$/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^zamknij$/i }));
    expect(screen.queryByRole('dialog', { name: /zleć badania/i })).not.toBeInTheDocument();
  });

  it('toggles the shelf lamp and dermatoscope decorations on and off', async () => {
    const user = userEvent.setup();
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);

    await screen.findByRole('button', { name: 'Dermatology Handbook' });

    // The desk lamp starts OFF by default; clicking it turns it on, then off again.
    const lamp = screen.getByRole('button', { name: /przełącz lampkę biurkową/i });
    expect(lamp).toHaveAttribute('aria-pressed', 'false');
    await user.click(lamp);
    expect(lamp).toHaveAttribute('aria-pressed', 'true');
    await user.click(lamp);
    expect(lamp).toHaveAttribute('aria-pressed', 'false');

    const dermatoscope = screen.getByRole('button', { name: /przełącz dermatoskop/i });
    expect(dermatoscope).toHaveAttribute('aria-pressed', 'false');
    await user.click(dermatoscope);
    expect(dermatoscope).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Dermatoskop gotowy')).toBeInTheDocument();
  });

  it('pins a new prevention note to the corkboard when clicked, up to the 6-note max', async () => {
    const user = userEvent.setup();
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);

    await screen.findByRole('button', { name: 'Dermatology Handbook' });

    const corkboard = screen.getByRole('button', { name: /przypnij nową notatkę profilaktyczną/i });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    for (let i = 0; i < 8; i += 1) {
      await user.click(corkboard);
    }

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('keeps the phone/order-tests button on the right side of the header, next to the ABCDE board', async () => {
    mockRoundFetch(OWNED_ITEMS);
    renderWithProviders(<Wall />);

    const orderTestsButton = await screen.findByRole('button', { name: /otwórz zlecenia badań/i });
    const abcdeButton = screen.getByRole('button', { name: /open the abcde mole self-check/i });

    // Order-tests (phone) button must come after the ABCDE board in DOM order, so it renders
    // to the right of it in the header's left-to-right flex layout.
    expect(orderTestsButton.compareDocumentPosition(abcdeButton) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});

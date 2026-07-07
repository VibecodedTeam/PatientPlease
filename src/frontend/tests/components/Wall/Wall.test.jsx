import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Wall } from '../../../components/Wall';
import { mockBooks } from '../../../components/Wall/mockBooks';

describe('Wall', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders the doctor office wall', () => {
    render(<Wall />);
    expect(screen.getByRole('region', { name: /doctor office wall/i })).toBeInTheDocument();
  });

  it('shows the pinned board with patients left today', () => {
    render(<Wall />);
    expect(screen.getByText('Patients left today: 5')).toBeInTheDocument();
  });

  it('only renders books that have been bought', () => {
    render(<Wall />);
    const boughtBooks = mockBooks.filter((book) => book.bought);
    const unboughtBooks = mockBooks.filter((book) => !book.bought);

    expect(boughtBooks.length).toBe(6);
    expect(unboughtBooks.length).toBeGreaterThan(0);

    boughtBooks.forEach((book) => {
      expect(screen.getByRole('button', { name: book.title })).toBeInTheDocument();
    });
    unboughtBooks.forEach((book) => {
      expect(screen.queryByRole('button', { name: book.title })).not.toBeInTheDocument();
    });
  });

  it('shows no book popup and no highlighted book before any click', () => {
    render(<Wall />);
    const boughtBook = mockBooks.find((book) => book.bought);

    expect(screen.queryByRole('dialog', { name: new RegExp(boughtBook.title, 'i') })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: boughtBook.title })).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens a book details popup and highlights the book after clicking, then closes it', async () => {
    const user = userEvent.setup();
    render(<Wall />);
    const boughtBook = mockBooks.find((book) => book.bought);

    await user.click(screen.getByRole('button', { name: boughtBook.title }));

    const popup = screen.getByRole('dialog', { name: new RegExp(boughtBook.title, 'i') });
    expect(popup).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: boughtBook.title })).toBeInTheDocument();
    expect(screen.getByText(boughtBook.description)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(boughtBook.hint.slice(0, 15)))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: boughtBook.title })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog', { name: new RegExp(boughtBook.title, 'i') })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: boughtBook.title })).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens and closes the settings popup', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open settings/i }));
    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('shows a disabled, non-functional log out option in settings', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    await user.click(screen.getByRole('button', { name: /open settings/i }));

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toBeDisabled();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('renders books passed in via the books prop instead of the mock data', () => {
    const customBooks = [
      { id: 'custom-1', title: 'Custom Handbook', category: 'Test', description: 'desc', hint: 'hint', bought: true },
    ];
    render(<Wall books={customBooks} />);

    expect(screen.getByRole('button', { name: 'Custom Handbook' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: mockBooks[0].title })).not.toBeInTheDocument();
  });

  it('shows an empty shelf message when there are no bought books', () => {
    render(<Wall books={[]} />);

    expect(screen.getByText(/no handbooks bought yet/i)).toBeInTheDocument();
    expect(screen.getByText(/visit the night shop/i)).toBeInTheDocument();
  });

  it('closes the book popup when clicking outside it', async () => {
    const user = userEvent.setup();
    render(<Wall />);
    const boughtBook = mockBooks.find((book) => book.bought);

    await user.click(screen.getByRole('button', { name: boughtBook.title }));
    expect(screen.getByRole('dialog', { name: new RegExp(boughtBook.title, 'i') })).toBeInTheDocument();

    const dialog = screen.getByRole('dialog', { name: new RegExp(boughtBook.title, 'i') });
    await user.click(dialog.parentElement);

    expect(screen.queryByRole('dialog', { name: new RegExp(boughtBook.title, 'i') })).not.toBeInTheDocument();
  });

  it('shows the prevention notes board with a default pinned note', () => {
    render(<Wall />);

    expect(screen.getByRole('button', { name: /pin new prevention note/i })).toBeInTheDocument();
    expect(screen.getByText('SPF daily')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('pins a new prevention note at a random board position when clicking the board itself', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    const board = screen.getByRole('button', { name: /pin new prevention note/i });
    await user.click(board);

    expect(screen.getByText('SPF daily')).toBeInTheDocument();
    expect(screen.getByText('Reapply SPF')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('pins a new note when activated with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    const board = screen.getByRole('button', { name: /pin new prevention note/i });
    board.focus();
    await user.keyboard('{Enter}');

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps at most 6 pinned notes, dropping the oldest and looping through tips', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    const board = screen.getByRole('button', { name: /pin new prevention note/i });
    for (let i = 0; i < 6; i += 1) {
      await user.click(board);
    }

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByText('SPF daily')).not.toBeInTheDocument();
    expect(screen.getByText('Watch ABCDE')).toBeInTheDocument();
  });

  it('toggles the shelf lamp on and off when clicked', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    const lamp = screen.getByRole('button', { name: /toggle desk lamp/i });
    expect(lamp).toHaveAttribute('aria-pressed', 'false');

    await user.click(lamp);
    expect(lamp).toHaveAttribute('aria-pressed', 'true');

    await user.click(lamp);
    expect(lamp).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles the dermatoscope on and off when clicked', async () => {
    const user = userEvent.setup();
    render(<Wall />);

    const dermatoscope = screen.getByRole('button', { name: /toggle dermatoscope/i });
    expect(dermatoscope).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Dermatoscope ready')).not.toBeInTheDocument();

    await user.click(dermatoscope);
    expect(dermatoscope).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Dermatoscope ready')).toBeInTheDocument();

    await user.click(dermatoscope);
    expect(dermatoscope).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Dermatoscope ready')).not.toBeInTheDocument();
  });

  it('closes the book popup safely if the selected book disappears from an updated books prop', async () => {
    const user = userEvent.setup();
    const initialBooks = [
      { id: 'book-a', title: 'Book A', category: 'Test', description: 'desc a', hint: 'hint a', bought: true },
      { id: 'book-b', title: 'Book B', category: 'Test', description: 'desc b', hint: 'hint b', bought: true },
    ];
    const { rerender } = render(<Wall books={initialBooks} />);

    await user.click(screen.getByRole('button', { name: 'Book A' }));
    expect(screen.getByRole('dialog', { name: /book a/i })).toBeInTheDocument();

    const booksWithoutA = [
      { id: 'book-b', title: 'Book B', category: 'Test', description: 'desc b', hint: 'hint b', bought: true },
    ];
    rerender(<Wall books={booksWithoutA} />);

    expect(screen.queryByRole('dialog', { name: /book a/i })).not.toBeInTheDocument();
  });
});

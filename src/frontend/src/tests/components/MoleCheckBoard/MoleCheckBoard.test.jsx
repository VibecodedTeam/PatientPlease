import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoleCheckBoard } from '../../../components/MoleCheckBoard';

describe('MoleCheckBoard', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders only the collapsed board with the five bold letters, no descriptions or switches', () => {
    render(<MoleCheckBoard />);

    const board = screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i });
    expect(within(board).getByText('A')).toBeInTheDocument();
    expect(within(board).getByText('B')).toBeInTheDocument();
    expect(within(board).getByText('C')).toBeInTheDocument();
    expect(within(board).getByText('D')).toBeInTheDocument();
    expect(within(board).getByText('E')).toBeInTheDocument();

    expect(screen.queryByText("Asymetria")).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('opens an expanded dialog into #overlay-root when the board is clicked', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));

    const dialog = screen.getByRole('dialog', { name: /reguła abcde/i });
    expect(dialog).toBeInTheDocument();
    expect(document.getElementById('overlay-root').contains(dialog)).toBe(true);
  });

  it('shows all five English descriptions together as soon as it expands', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));

    expect(screen.getByText("Asymetria")).toBeInTheDocument();
    expect(screen.getByText("Brzegi")).toBeInTheDocument();
    expect(screen.getByText("Kolor")).toBeInTheDocument();
    expect(screen.getByText("Średnica")).toBeInTheDocument();
    expect(screen.getByText("Ewolucja")).toBeInTheDocument();
    expect(screen.getByText(/Większa niż 6 mm/)).toBeInTheDocument();
  });

  it('renders exactly five switches, all unchecked by default', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(5);
    switches.forEach((toggle) => expect(toggle).toHaveAttribute('aria-checked', 'false'));
  });

  it('calls onSelectionChange with letters in fixed A-E order, not click order', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    render(<MoleCheckBoard onSelectionChange={onSelectionChange} />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: średnica/i }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['D']);

    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['A', 'D']);
  });

  it('unchecking a toggle removes it from the emitted selection', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    render(<MoleCheckBoard onSelectionChange={onSelectionChange} />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    const asymetriaSwitch = screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i });

    await user.click(asymetriaSwitch);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['A']);
    expect(asymetriaSwitch).toHaveAttribute('aria-checked', 'true');

    await user.click(asymetriaSwitch);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(asymetriaSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps toggles independent of each other (multi-select, not radio)', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i }));
    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: średnica/i }));

    expect(screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /zaznacz cechę: średnica/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /zaznacz cechę: brzegi/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /zaznacz cechę: kolor/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /zaznacz cechę: ewolucja/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('pre-checks the letters passed via initialSelected once expanded', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard initialSelected={['B', 'E']} />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));

    expect(screen.getByRole('switch', { name: /zaznacz cechę: brzegi/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /zaznacz cechę: ewolucja/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps selection state across closing and reopening the overlay', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: kolor/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    expect(screen.getByRole('switch', { name: /zaznacz cechę: kolor/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('does not dismiss when the layer behind the panel is clicked, so the rest of the page stays usable', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(dialog.parentElement);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dismisses the dialog when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not dismiss the dialog when clicking inside it', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    await user.click(screen.getByRole('dialog'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dismisses the dialog via the explicit close button', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    await user.click(screen.getByRole('button', { name: /zamknij/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is draggable via its handle, offsetting the panel with a CSS transform', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    const dialog = screen.getByRole('dialog');
    const handle = screen.getByTestId('drag-handle');

    expect(dialog.style.transform).toBe('translate(0px, 0px)');

    fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 160, clientY: 140 });
    fireEvent.mouseUp(window);

    expect(dialog.style.transform).toBe('translate(60px, 40px)');
  });

  it('lights up a letter on the collapsed board and the expanded header as soon as its feature is toggled on', async () => {
    const user = userEvent.setup();
    render(<MoleCheckBoard />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));

    expect(screen.getByTestId('board-letter-A')).not.toHaveClass('letterLit');
    expect(screen.getByTestId('expanded-header-letter-A')).not.toHaveClass('expandedLetterLit');

    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i }));

    expect(screen.getByTestId('board-letter-A')).toHaveClass('letterLit');
    expect(screen.getByTestId('expanded-header-letter-A')).toHaveClass('expandedLetterLit');
    expect(screen.getByTestId('board-letter-B')).not.toHaveClass('letterLit');

    await user.click(screen.getByRole('switch', { name: /zaznacz cechę: asymetria/i }));

    expect(screen.getByTestId('board-letter-A')).not.toHaveClass('letterLit');
    expect(screen.getByTestId('expanded-header-letter-A')).not.toHaveClass('expandedLetterLit');
  });

  it('calls onExpandedChange with true on open and false on close', async () => {
    const user = userEvent.setup();
    const onExpandedChange = jest.fn();
    render(<MoleCheckBoard onExpandedChange={onExpandedChange} />);

    await user.click(screen.getByRole('button', { name: /otwórz samobadanie znamion abcde/i }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: /zamknij/i }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });
});

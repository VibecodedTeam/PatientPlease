import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Excisio } from '../../../components/Excisio';

describe('Excisio', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('opens on the tutorial overlay explaining the technique', () => {
    render(<Excisio />);

    expect(screen.getByRole('heading', { name: /technika biopsji wycinającej/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i })).toBeInTheDocument();
  });

  it('starts the operation and shows the disinfect step with the gauze ready to take', async () => {
    const user = userEvent.setup();
    render(<Excisio />);

    await user.click(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i }));

    expect(screen.getByText(/krok 1 · odkażanie pola/i)).toBeInTheDocument();
    const tray = screen.getByText('Tacka').parentElement;
    expect(within(tray).getByText('Gazik')).toBeInTheDocument();
  });

  it('lets the player pick up the active tool for the current step', async () => {
    const user = userEvent.setup();
    render(<Excisio />);
    await user.click(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i }));

    await user.click(screen.getByRole('button', { name: /gazik/i }));

    expect(screen.getByText('W dłoni')).toBeInTheDocument();
  });

  it('keeps a not-yet-active tool locked (no pick-up label) until its own step', async () => {
    const user = userEvent.setup();
    render(<Excisio />);
    await user.click(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i }));

    const syringeButton = screen.getByRole('button', { name: /strzykawka/i });
    await user.click(syringeButton);

    expect(screen.queryByText('W dłoni')).not.toBeInTheDocument();
  });

  it('zooms in and out with the +/- controls', async () => {
    const user = userEvent.setup();
    render(<Excisio />);
    await user.click(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i }));

    expect(screen.getByText('100%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /przybliż/i }));
    expect(screen.getByText('125%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /oddal/i }));
    await user.click(screen.getByRole('button', { name: /oddal/i }));
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('reopens the tutorial from the header button mid-operation', async () => {
    const user = userEvent.setup();
    render(<Excisio />);
    await user.click(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i }));

    await user.click(screen.getByRole('button', { name: /poradnik/i }));

    expect(screen.getByRole('heading', { name: /technika biopsji wycinającej/i })).toBeInTheDocument();
  });

  it('shows no brand title, level number, or money/earnings figure in the header', async () => {
    // Tutorial dismissed first: the tutorial copy's unrelated Polish text ("rozłóż",
    // "zeszły") incidentally contains the substring "zł", which would otherwise collide
    // with the /zł/ money-figure check below even though it has nothing to do with cash.
    const user = userEvent.setup();
    render(<Excisio />);
    await user.click(screen.getByRole('button', { name: /rozumiem — zaczynamy zabieg/i }));

    expect(screen.queryByText('EXCISIO')).not.toBeInTheDocument();
    expect(screen.queryByText('symulator biopsji wycinającej')).not.toBeInTheDocument();
    expect(screen.queryByText('Poziom')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ · .+/)).not.toBeInTheDocument();
    expect(screen.queryByText('Zarobek')).not.toBeInTheDocument();
    expect(screen.queryByText(/zł/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /poradnik/i })).toBeInTheDocument();
  });
});

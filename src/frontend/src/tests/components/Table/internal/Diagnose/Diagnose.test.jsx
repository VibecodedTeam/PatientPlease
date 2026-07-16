import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Diagnose } from '../../../../../components/Table/internal/Diagnose/Diagnose';

describe('Diagnose', () => {
  it('renders the title and all diagnosis options', () => {
    render(<Diagnose />);
    expect(screen.getByText('Diagnoza')).toBeInTheDocument();
    expect(screen.getByText('Brak zmian skórnych')).toBeInTheDocument();
    expect(screen.getByText('Łagodne podrażnienie skóry')).toBeInTheDocument();
    expect(screen.getByText('Rak skóry')).toBeInTheDocument();
  });

  it('disables the submit button until an option is selected', async () => {
    const user = userEvent.setup();
    render(<Diagnose />);
    expect(screen.getByText('Zatwierdź diagnozę')).toBeDisabled();

    await user.click(screen.getByText('Rak skóry'));
    expect(screen.getByText('Zatwierdź diagnozę')).not.toBeDisabled();
  });

  it('calls onSubmit with the selected option when submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    render(<Diagnose onSubmit={handleSubmit} />);

    await user.click(screen.getByText('Brak zmian skórnych'));
    await user.click(screen.getByText('Zatwierdź diagnozę'));

    expect(handleSubmit).toHaveBeenCalledWith({ id: 'no-condition', label: 'Brak zmian skórnych' });
  });

  it('disables the submit button while onSubmit is pending, to prevent double submission', async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const handleSubmit = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<Diagnose onSubmit={handleSubmit} />);

    await user.click(screen.getByText('Brak zmian skórnych'));
    await user.click(screen.getByText('Zatwierdź diagnozę'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Zatwierdź diagnozę')).toBeDisabled();

    resolveSubmit();
    await waitFor(() => expect(screen.getByText('Zatwierdź diagnozę')).not.toBeDisabled());
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders errorMessage when provided', () => {
    render(<Diagnose errorMessage="Nie udało się zatwierdzić diagnozy. Spróbuj ponownie." />);
    expect(
      screen.getByText('Nie udało się zatwierdzić diagnozy. Spróbuj ponownie.'),
    ).toBeInTheDocument();
  });

  it('renders no error message by default', () => {
    render(<Diagnose />);
    expect(screen.queryByText(/nie udało się zatwierdzić/i)).not.toBeInTheDocument();
  });

  it('disables the submit button when disabled is true, even with an option selected', async () => {
    const user = userEvent.setup();
    render(<Diagnose disabled />);

    await user.click(screen.getByText('Rak skóry'));

    expect(screen.getByText('Zatwierdź diagnozę')).toBeDisabled();
  });

  it('does not call onSubmit when disabled is true', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    render(<Diagnose onSubmit={handleSubmit} disabled />);

    await user.click(screen.getByText('Rak skóry'));
    await user.click(screen.getByText('Zatwierdź diagnozę'));

    expect(handleSubmit).not.toHaveBeenCalled();
  });
});

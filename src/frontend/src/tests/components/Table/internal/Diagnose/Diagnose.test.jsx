import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Diagnose } from '../../../../../components/Table/internal/Diagnose/Diagnose';

describe('Diagnose', () => {
  it('renders the title and all diagnosis options', () => {
    render(<Diagnose />);
    expect(screen.getByText('Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('No Skin Condition')).toBeInTheDocument();
    expect(screen.getByText('Minor Skin Irritation')).toBeInTheDocument();
    expect(screen.getByText('Skin Cancer')).toBeInTheDocument();
  });

  it('disables the submit button until an option is selected', async () => {
    const user = userEvent.setup();
    render(<Diagnose />);
    expect(screen.getByText('Submit Diagnosis')).toBeDisabled();

    await user.click(screen.getByText('Skin Cancer'));
    expect(screen.getByText('Submit Diagnosis')).not.toBeDisabled();
  });

  it('calls onSubmit with the selected option when submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    render(<Diagnose onSubmit={handleSubmit} />);

    await user.click(screen.getByText('No Skin Condition'));
    await user.click(screen.getByText('Submit Diagnosis'));

    expect(handleSubmit).toHaveBeenCalledWith({ id: 'no-condition', label: 'No Skin Condition' });
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

    await user.click(screen.getByText('No Skin Condition'));
    await user.click(screen.getByText('Submit Diagnosis'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Submit Diagnosis')).toBeDisabled();

    resolveSubmit();
    await waitFor(() => expect(screen.getByText('Submit Diagnosis')).not.toBeDisabled());
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders errorMessage when provided', () => {
    render(<Diagnose errorMessage="Could not submit diagnosis. Please try again." />);
    expect(
      screen.getByText('Could not submit diagnosis. Please try again.'),
    ).toBeInTheDocument();
  });

  it('renders no error message by default', () => {
    render(<Diagnose />);
    expect(screen.queryByText(/could not submit/i)).not.toBeInTheDocument();
  });
});

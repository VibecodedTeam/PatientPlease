import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Diagnose } from '../../../../components/TableFol/DiagnoseFol/Diagnose';

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
});

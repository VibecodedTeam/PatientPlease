import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders the given message', () => {
    render(<ConfirmDialog message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog message="Are you sure?" onConfirm={onConfirm} onCancel={() => {}} />);
    screen.getByText('Potwierdź').click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog message="Are you sure?" onConfirm={() => {}} onCancel={onCancel} />);
    screen.getByText('Anuluj').click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

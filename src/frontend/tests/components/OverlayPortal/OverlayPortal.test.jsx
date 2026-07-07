import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayPortal } from '../../../components/OverlayPortal';

describe('OverlayPortal', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders children into the #overlay-root portal target', () => {
    render(<OverlayPortal>Overlay content</OverlayPortal>);
    expect(screen.getByText('Overlay content')).toBeInTheDocument();
    expect(document.getElementById('overlay-root').textContent).toBe('Overlay content');
  });

  it('calls onDismiss when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    render(
      <OverlayPortal onDismiss={onDismiss}>
        <div>Overlay content</div>
      </OverlayPortal>
    );

    await user.click(screen.getByText('Overlay content').parentElement);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when clicking content that stops propagation', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    render(
      <OverlayPortal onDismiss={onDismiss}>
        <div onClick={(event) => event.stopPropagation()}>Overlay content</div>
      </OverlayPortal>
    );

    await user.click(screen.getByText('Overlay content'));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    render(
      <OverlayPortal onDismiss={onDismiss}>
        <div>Overlay content</div>
      </OverlayPortal>
    );

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

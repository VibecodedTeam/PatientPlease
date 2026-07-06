import React from 'react';
import { render, screen } from '@testing-library/react';
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
});

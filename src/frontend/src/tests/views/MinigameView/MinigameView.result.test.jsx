import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// esbuild-jest doesn't hoist jest.mock() above imports the way Babel does —
// this file avoids JSX for the mocked import, matching the same workaround in
// tests/AppRoutes.test.jsx and tests/views/MainView/MainView.test.jsx.
jest.mock('../../../components/Excisio', () => ({
  Excisio: ({ onComplete }) =>
    require('react').createElement('button', { onClick: () => onComplete(80) }, 'fake-finish'),
}));

const { MinigameView } = require('../../../views/MinigameView');

const h = React.createElement;

describe('MinigameView result reporting', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
    window.close = jest.fn();
    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: { postMessage: jest.fn() },
    });
  });

  it('posts the score to window.opener and closes the tab once Excisio completes', async () => {
    const user = userEvent.setup();
    render(
      h(
        MemoryRouter,
        { initialEntries: ['/game/main/minigame?shopItemId=exam-1&caseId=case-1'] },
        h(Routes, null, h(Route, { path: '/game/main/minigame', element: h(MinigameView) })),
      ),
    );

    await user.click(screen.getByText('fake-finish'));

    expect(window.opener.postMessage).toHaveBeenCalledWith(
      { type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 80 },
      window.location.origin,
    );
    expect(window.close).toHaveBeenCalled();
  });

  it('does not throw when there is no window.opener (e.g. direct navigation)', async () => {
    Object.defineProperty(window, 'opener', { configurable: true, value: null });
    const user = userEvent.setup();
    render(
      h(
        MemoryRouter,
        { initialEntries: ['/game/main/minigame?shopItemId=exam-1&caseId=case-1'] },
        h(Routes, null, h(Route, { path: '/game/main/minigame', element: h(MinigameView) })),
      ),
    );

    await user.click(screen.getByText('fake-finish'));

    expect(window.close).toHaveBeenCalled();
  });
});

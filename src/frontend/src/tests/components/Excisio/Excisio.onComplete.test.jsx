import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// esbuild-jest doesn't hoist jest.mock() above imports the way Babel does, so
// this file avoids JSX for the mocked import — see the same convention in
// tests/AppRoutes.test.jsx and tests/views/MainView/MainView.test.jsx.
jest.mock('../../../components/Excisio/useExcisio', () => ({
  useExcisio: jest.fn(),
}));

const { useExcisio } = require('../../../components/Excisio/useExcisio');
const { Excisio } = require('../../../components/Excisio');

const h = React.createElement;

function noopHandlers() {
  return new Proxy({}, { get: () => jest.fn() });
}

function noopRefs() {
  return new Proxy({}, { get: () => ({ current: null }) });
}

function buildUi(overrides) {
  return {
    phase: 'disinfect',
    equipped: null,
    deepCount: 0,
    skinCount: 0,
    disinfectPct: 0,
    creamPct: 0,
    injCount: 0,
    screen: 'play',
    level: 1,
    partName: 'Przedramię',
    cash: 0,
    zoom: 1,
    warn: '',
    redFlash: false,
    revealing: false,
    alarm: false,
    alarmText: '',
    showTray: false,
    showCustomDraw: false,
    plasterColor: '#000000',
    drawColor: '#000000',
    drawThickness: 2,
    showResult: false,
    result: null,
    cheer: false,
    ...overrides,
  };
}

function mockCompletedRun() {
  useExcisio.mockReturnValue({
    ui: buildUi({
      showResult: true,
      result: {
        score: 42,
        tone: '#a78bfa',
        title: 'Wynik',
        msg: 'Podsumowanie',
        money: '21,00 zł',
        disinfect: 80,
        inject: 70,
        excise: 60,
        suture: 50,
        wrong: false,
      },
    }),
    refs: noopRefs(),
    DEEP_NEED: 3,
    SKIN_NEED: 5,
    plasterCards: [],
    toolStatus: () => 'locked',
    handlers: noopHandlers(),
  });
}

describe('Excisio onComplete', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('renders a Finish button that reports the score once onComplete is provided', () => {
    mockCompletedRun();
    const onComplete = jest.fn();

    render(h(Excisio, { onComplete }));

    fireEvent.click(screen.getByText('Zakończ i wyślij wynik'));

    expect(onComplete).toHaveBeenCalledWith(42);
  });

  it('does not render a Finish button when onComplete is not provided', () => {
    mockCompletedRun();

    render(h(Excisio, {}));

    expect(screen.queryByText('Zakończ i wyślij wynik')).not.toBeInTheDocument();
  });
});

describe('Excisio onComplete auto-timer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('automatically calls onComplete 5 seconds after the result is shown, even without clicking Finish', () => {
    mockCompletedRun();
    const onComplete = jest.fn();

    render(h(Excisio, { onComplete }));

    expect(onComplete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);

    expect(onComplete).toHaveBeenCalledWith(42);
  });

  it('clicking Finish before the 5s timer elapses fires immediately and does not double-fire', () => {
    mockCompletedRun();
    const onComplete = jest.fn();

    render(h(Excisio, { onComplete }));
    fireEvent.click(screen.getByText('Zakończ i wyślij wynik'));

    expect(onComplete).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

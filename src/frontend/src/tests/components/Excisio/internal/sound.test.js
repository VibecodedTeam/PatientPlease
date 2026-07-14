import { playScarySting, playFanfare } from '../../../../components/Excisio/internal/sound';

/** Minimal fake Web Audio graph, just enough for the sound helpers to run against. */
function makeFakeAudioContext() {
  const node = () => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), value: 0 },
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), value: 0 },
  });
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: jest.fn(),
    createOscillator: jest.fn(node),
    createGain: jest.fn(node),
  };
}

describe('playScarySting / playFanfare', () => {
  it('does nothing (no throw) when the environment has no AudioContext', () => {
    const ref = { current: null };
    expect(() => playScarySting(ref)).not.toThrow();
    expect(() => playFanfare(ref)).not.toThrow();
    expect(ref.current).toBeNull();
  });

  it('drives oscillators on a real-ish AudioContext without throwing', () => {
    const fake = makeFakeAudioContext();
    window.AudioContext = jest.fn(() => fake);
    const ref = { current: null };

    expect(() => playScarySting(ref)).not.toThrow();
    expect(ref.current).toBe(fake);
    expect(fake.createOscillator).toHaveBeenCalled();

    expect(() => playFanfare(ref)).not.toThrow();

    delete window.AudioContext;
  });

  it('reuses the same cached AudioContext across calls', () => {
    const fake = makeFakeAudioContext();
    window.AudioContext = jest.fn(() => fake);
    const ref = { current: null };

    playScarySting(ref);
    const firstCallCount = window.AudioContext.mock.calls.length;
    playFanfare(ref);

    expect(window.AudioContext.mock.calls.length).toBe(firstCallCount);
    delete window.AudioContext;
  });
});

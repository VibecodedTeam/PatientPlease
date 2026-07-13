import React from 'react';
import { act, render } from '@testing-library/react';
import { Music } from '../../../components/Music';
import { TRACKS } from '../../../components/Music/internal/tracks';

describe('Music', () => {
  let playSpy;
  let pauseSpy;

  beforeEach(() => {
    playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  it('renders a single audio element with no visible controls', () => {
    const { container } = render(<Music />);
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio).not.toHaveAttribute('controls');
  });

  it('sets the initial audio source to one of the known tracks', () => {
    const { container } = render(<Music />);
    const audio = container.querySelector('audio');
    const matches = TRACKS.some((track) => audio.src.endsWith(track));
    expect(matches).toBe(true);
  });

  it('attempts to start playback on mount', () => {
    render(<Music />);
    expect(playSpy).toHaveBeenCalled();
  });

  it('advances to the next track in order when the current track ends, wrapping after the last', () => {
    const { container } = render(<Music />);
    const audio = container.querySelector('audio');
    const startTrack = TRACKS.find((track) => audio.src.endsWith(track));
    const startIndex = TRACKS.indexOf(startTrack);

    for (let i = 1; i <= TRACKS.length; i += 1) {
      act(() => {
        audio.dispatchEvent(new Event('ended'));
      });
      const expectedIndex = (startIndex + i) % TRACKS.length;
      expect(audio.src.endsWith(TRACKS[expectedIndex])).toBe(true);
    }
  });
});

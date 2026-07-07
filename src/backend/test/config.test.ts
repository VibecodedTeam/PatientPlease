import { resolvePort } from '../src/config.js';

describe('resolvePort', () => {
  it('returns the parsed value when PORT is set', () => {
    expect(resolvePort('5000', 4000)).toBe(5000);
  });

  it('falls back to the default when PORT is unset', () => {
    expect(resolvePort(undefined, 4000)).toBe(4000);
  });

  it('falls back to the default when PORT is an empty string', () => {
    expect(resolvePort('', 4000)).toBe(4000);
  });
});

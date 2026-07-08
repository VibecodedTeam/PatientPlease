/**
 * Picks a random item from `list`.
 * @param {string[]} list
 * @param {() => number} [randomFn] - injectable in place of Math.random for tests
 * @returns {string | null} the picked item, or null if the list is empty
 */
export function pickRandomImage(list, randomFn = Math.random) {
  if (list.length === 0) return null;
  const index = Math.floor(randomFn() * list.length);
  return list[index];
}

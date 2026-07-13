/**
 * @param {number} trackCount
 * @returns {number} a random valid index into a track list of the given length
 */
export function pickRandomStartIndex(trackCount) {
  return Math.floor(Math.random() * trackCount);
}

/**
 * @param {number} currentIndex
 * @param {number} trackCount
 * @returns {number} the next index, wrapping back to 0 after the last track
 */
export function nextIndex(currentIndex, trackCount) {
  return (currentIndex + 1) % trackCount;
}

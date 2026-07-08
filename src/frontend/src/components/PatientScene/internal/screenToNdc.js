/**
 * Maps a click's client coordinates to normalized device coordinates (-1..1),
 * matching THREE.Raycaster.setFromCamera's expected input.
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ left: number, top: number, width: number, height: number }} rect
 *   a plain shape (e.g. from element.getBoundingClientRect()), kept as a plain
 *   object rather than the DOM type so this stays testable without a real DOM element
 * @returns {{ x: number, y: number }}
 */
export function screenToNdc(clientX, clientY, rect) {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

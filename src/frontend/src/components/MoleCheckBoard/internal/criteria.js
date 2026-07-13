/**
 * @typedef {object} MoleCheckCriterion
 * @property {'A'|'B'|'C'|'D'|'E'} letter
 * @property {string} label
 * @property {string} description
 */

/** @type {MoleCheckCriterion[]} */
export const CRITERIA = [
  {
    letter: 'A',
    label: 'Asymmetry',
    description: 'One half of the mole differs in shape or size from the other.',
  },
  {
    letter: 'B',
    label: 'Border',
    description: 'The edges are ragged, notched, or blurred rather than smooth.',
  },
  {
    letter: 'C',
    label: 'Color',
    description: 'Uneven, varied color — shades of brown and black, sometimes red or blue.',
  },
  {
    letter: 'D',
    label: 'Diameter',
    description: 'Larger than 6 mm across — roughly the size of a pencil eraser.',
  },
  {
    letter: 'E',
    label: 'Evolving',
    description: 'The mole changes over time — in size, shape, color, or appearance.',
  },
];

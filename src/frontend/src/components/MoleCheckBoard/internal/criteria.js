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
    label: 'Asymetria',
    description: 'Jedna połowa znamienia różni się kształtem lub wielkością od drugiej.',
  },
  {
    letter: 'B',
    label: 'Brzegi',
    description: 'Brzegi znamienia są postrzępione, nierówne lub niewyraźne, a nie gładkie.',
  },
  {
    letter: 'C',
    label: 'Kolor',
    description: 'Niejednolity, zmienny kolor – odcienie brązu i czerni, a czasem czerwień lub niebieski.',
  },
  {
    letter: 'D',
    label: 'Duża średnica',
    description: 'Średnica większa niż 6 mm – w przybliżeniu wielkość gumki na ołówku.',
  },
  {
    letter: 'E',
    label: 'Ewolucja',
    description: 'Znamię zmienia się w czasie – w rozmiarze, kształcie, kolorze lub wyglądzie.',
  },
];

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
    description: 'Jedna połowa znamienia różni się kształtem lub rozmiarem od drugiej.',
  },
  {
    letter: 'B',
    label: 'Brzegi',
    description: 'Brzegi są postrzępione, karbowane lub rozmyte, a nie gładkie.',
  },
  {
    letter: 'C',
    label: 'Kolor',
    description: 'Nierówny, zróżnicowany kolor — odcienie brązu i czerni, czasem czerwony lub niebieski.',
  },
  {
    letter: 'D',
    label: 'Średnica',
    description: 'Większa niż 6 mm średnicy — mniej więcej wielkość gumki na końcu ołówka.',
  },
  {
    letter: 'E',
    label: 'Ewolucja',
    description: 'Znamię zmienia się z czasem — rozmiarem, kształtem, kolorem lub wyglądem.',
  },
];

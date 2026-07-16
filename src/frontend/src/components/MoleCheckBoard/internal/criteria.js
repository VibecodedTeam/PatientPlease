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
    description: 'Krawędzie są postrzępione, nierówne lub rozmyte, a nie gładkie.',
  },
  {
    letter: 'C',
    label: 'Kolor',
    description: 'Nierównomierny, zróżnicowany kolor — odcienie brązu i czerni, czasem czerwony lub niebieski.',
  },
  {
    letter: 'D',
    label: 'Średnica',
    description: 'Większa niż 6 mm — mniej więcej wielkości gumki od ołówka.',
  },
  {
    letter: 'E',
    label: 'Ewolucja',
    description: 'Znamię zmienia się w czasie — rozmiar, kształt, kolor lub wygląd.',
  },
];

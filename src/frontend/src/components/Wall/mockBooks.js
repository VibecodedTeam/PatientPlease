/**
 * Mock handbook data for the interactive books wall.
 * @typedef {Object} Book
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string} description
 * @property {string} hint
 * @property {boolean} bought
 */

/** @type {Book[]} */
export const mockBooks = [
  {
    id: 'abcde-rule',
    title: 'ABCDE Rule',
    category: 'Diagnostic Guide',
    description:
      'A memorable framework for spotting warning signs of melanoma: Asymmetry, Border, Color, Diameter, Evolving.',
    hint: 'If a mole scores on three or more letters, treat it as suspicious.',
    bought: true,
  },
  {
    id: 'uv-exposure',
    title: 'UV Exposure',
    category: 'Risk Factors',
    description:
      'Covers how cumulative and intense UV exposure raises skin cancer risk, including tanning bed use and occupational sun exposure.',
    hint: 'Ask about sunburn history and outdoor occupations before ruling out risk.',
    bought: true,
  },
  {
    id: 'family-history',
    title: 'Family History',
    category: 'Risk Factors',
    description:
      'Explains how a family history of melanoma or atypical mole syndrome changes a patient’s baseline risk.',
    hint: 'A first-degree relative with melanoma roughly doubles a patient’s risk.',
    bought: true,
  },
  {
    id: 'benign-lesions',
    title: 'Benign Lesions',
    category: 'Reference',
    description:
      'Illustrated reference of common benign skin findings — seborrheic keratosis, dermatofibroma, cherry angioma — to avoid false positives.',
    hint: 'Stable appearance over years is reassuring, but always compare against ABCDE.',
    bought: true,
  },
  {
    id: 'sunburn-history',
    title: 'Sunburn History',
    category: 'Risk Factors',
    description:
      'Explains why even a few severe sunburns in childhood or adolescence meaningfully raise lifetime melanoma risk.',
    hint: 'Ask about blistering sunburns, not just general sun exposure.',
    bought: true,
  },
  {
    id: 'skin-self-check',
    title: 'Skin Self-Check',
    category: 'Patient Education',
    description:
      'A guide for teaching patients how to perform a thorough monthly self-examination of their own skin, including hard-to-see areas.',
    hint: 'Recommend a hand mirror and a second person to check the back and scalp.',
    bought: true,
  },
  {
    id: 'advanced-dermoscopy',
    title: 'Advanced Dermoscopy',
    category: 'Advanced Technique',
    description:
      'Advanced pattern-recognition techniques using a dermatoscope, including pigment network and vascular pattern analysis.',
    hint: 'Not yet purchased — available from the shop once unlocked.',
    bought: false,
  },
];

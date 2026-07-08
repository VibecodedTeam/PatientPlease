const FILENAMES = [
  'ISIC_0000002.jpg',
  'ISIC_0000004.jpg',
  'ISIC_0000013.jpg',
  'ISIC_0000022.jpg',
  'ISIC_0000026.jpg',
  'ISIC_0000029.jpg',
  'ISIC_0000030.jpg',
  'ISIC_0000031.jpg',
  'ISIC_0000035.jpg',
  'ISIC_0000036.jpg',
  'ISIC_0000040.jpg',
  'ISIC_0000043.jpg',
  'ISIC_0000046.jpg',
  'ISIC_0000049.jpg',
  'ISIC_0000054.jpg',
  'ISIC_0000056.jpg',
];

/** Static asset URLs (served from Vite's public/melanoma/) for the popup's random image. */
export const MELANOMA_IMAGES = FILENAMES.map((filename) => `/melanoma/${filename}`);

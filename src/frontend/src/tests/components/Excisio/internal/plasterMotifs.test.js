import {
  CUSTOM_DRAW_BASE,
  DRAW_COLORS,
  DRAW_THICKNESSES,
  PLASTER_DEFS,
  motifSvg,
  plasterSvg,
} from '../../../../components/Excisio/internal/plasterMotifs';

describe('PLASTER_DEFS', () => {
  it('has a unique id for every plaster design', () => {
    const ids = PLASTER_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('every entry has a name, body color and pad color', () => {
    PLASTER_DEFS.forEach((d) => {
      expect(typeof d.name).toBe('string');
      expect(d.name.length).toBeGreaterThan(0);
      expect(typeof d.body).toBe('string');
      expect(typeof d.pad).toBe('string');
    });
  });
});

describe('motifSvg', () => {
  it('renders markup for a known motif type', () => {
    const svg = motifSvg('heart', 10, 10, 16, '#fff');
    expect(svg).toContain('<g');
    expect(svg).toContain('#fff');
  });

  it('returns an empty string for an unknown/absent motif', () => {
    expect(motifSvg(undefined, 0, 0, 16, '#fff')).toBe('');
    expect(motifSvg('nonsense', 0, 0, 16, '#fff')).toBe('');
  });

  it.each(['sun', 'dog', 'bunny', 'frog', 'person'])('renders markup for the %s motif', (type) => {
    const svg = motifSvg(type, 10, 10, 16, '#123456');
    expect(svg).toContain('#123456');
    expect(svg.length).toBeGreaterThan(0);
  });
});

describe('PLASTER_DEFS motif variety', () => {
  it.each(['sun', 'dog', 'bunny', 'frog', 'person'])('includes at least one %s design', (motif) => {
    expect(PLASTER_DEFS.some((d) => d.motif === motif)).toBe(true);
  });
});

describe('DRAW_COLORS', () => {
  it('offers black, white and 7 distinct rainbow colors for the pen', () => {
    expect(new Set(DRAW_COLORS).size).toBe(DRAW_COLORS.length);
    expect(DRAW_COLORS).toContain('#1c1c1e');
    expect(DRAW_COLORS).toContain('#ffffff');
    expect(DRAW_COLORS.length).toBe(9);
    DRAW_COLORS.forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/));
  });
});

describe('DRAW_THICKNESSES', () => {
  it('offers distinct, ascending pen widths', () => {
    expect(new Set(DRAW_THICKNESSES).size).toBe(DRAW_THICKNESSES.length);
    DRAW_THICKNESSES.forEach((width) => expect(typeof width).toBe('number'));
    const sorted = [...DRAW_THICKNESSES].sort((a, b) => a - b);
    expect(DRAW_THICKNESSES).toEqual(sorted);
  });
});

describe('CUSTOM_DRAW_BASE', () => {
  it('is a blank plaster (no motif) usable as a drawing surface', () => {
    expect(typeof CUSTOM_DRAW_BASE.body).toBe('string');
    expect(typeof CUSTOM_DRAW_BASE.pad).toBe('string');
    expect(CUSTOM_DRAW_BASE.motif).toBeFalsy();
    expect(plasterSvg(CUSTOM_DRAW_BASE).startsWith('<svg')).toBe(true);
  });
});

describe('plasterSvg', () => {
  it('produces a self-contained <svg> using the design colors', () => {
    const def = PLASTER_DEFS[0];
    const svg = plasterSvg(def);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(def.body);
    expect(svg).toContain(def.pad);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('places motif icons on the pad when the design has one', () => {
    const withMotif = PLASTER_DEFS.find((d) => d.motif);
    const svg = plasterSvg(withMotif);
    expect(svg).toContain(withMotif.mc);
  });
});

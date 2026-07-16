import { TOOL_CURSORS } from '../../../../components/Excisio/internal/cursors';

describe('TOOL_CURSORS', () => {
  it('provides a CSS cursor value for every tool', () => {
    ['wipe', 'syringe', 'scissors', 'needle', 'cream'].forEach((tool) => {
      expect(TOOL_CURSORS[tool]).toEqual(expect.stringContaining('url("data:image/svg+xml,'));
      expect(TOOL_CURSORS[tool]).toEqual(expect.stringContaining('crosshair'));
    });
  });
});

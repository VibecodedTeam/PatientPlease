import { screenToNdc } from '../../../../components/PatientScene/internal/screenToNdc';

describe('screenToNdc', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it('maps the center of the rect to (0, 0)', () => {
    expect(screenToNdc(200, 100, rect)).toEqual({ x: 0, y: 0 });
  });

  it('maps the top-left corner to (-1, 1)', () => {
    expect(screenToNdc(100, 50, rect)).toEqual({ x: -1, y: 1 });
  });

  it('maps the bottom-right corner to (1, -1)', () => {
    expect(screenToNdc(300, 150, rect)).toEqual({ x: 1, y: -1 });
  });
});

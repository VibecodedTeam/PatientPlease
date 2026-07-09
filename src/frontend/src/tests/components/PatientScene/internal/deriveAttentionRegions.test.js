import { deriveAttentionRegions } from '../../../../components/PatientScene/internal/deriveAttentionRegions';

describe('deriveAttentionRegions', () => {
  it('returns the unique, non-null attentionPointRegion values from a list of documents', () => {
    const documents = [
      { id: 'd1', attentionPointRegion: 'LEFT_ARM' },
      { id: 'd2', attentionPointRegion: null },
      { id: 'd3', attentionPointRegion: 'HEAD' },
      { id: 'd4', attentionPointRegion: 'LEFT_ARM' },
    ];

    expect(deriveAttentionRegions(documents)).toEqual(['LEFT_ARM', 'HEAD']);
  });

  it('returns an empty array when given no documents', () => {
    expect(deriveAttentionRegions([])).toEqual([]);
    expect(deriveAttentionRegions(undefined)).toEqual([]);
  });

  it('drops regions with no known 3D coordinate instead of passing them through', () => {
    const documents = [
      { id: 'd1', attentionPointRegion: 'HEAD' },
      { id: 'd2', attentionPointRegion: 'NOT_A_REAL_REGION' },
    ];

    expect(deriveAttentionRegions(documents)).toEqual(['HEAD']);
  });
});

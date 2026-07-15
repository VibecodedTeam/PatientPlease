import { formatKeyLabel, formatHistoryContent } from '../../../../components/Notebook/internal/formatDocumentContent';

describe('formatKeyLabel', () => {
  it('inserts a space before each uppercase letter and capitalizes the first character', () => {
    expect(formatKeyLabel('sunbedUse')).toBe('Sunbed Use');
    expect(formatKeyLabel('occupationalExposure')).toBe('Occupational Exposure');
  });
});

describe('formatHistoryContent', () => {
  it('returns an empty string for falsy content', () => {
    expect(formatHistoryContent(null)).toBe('');
    expect(formatHistoryContent(undefined)).toBe('');
  });

  it('returns string content as-is', () => {
    expect(formatHistoryContent('Przez lata korzystała z solarium.')).toBe(
      'Przez lata korzystała z solarium.',
    );
  });

  it('returns a single-key object as its bare value, with no label', () => {
    expect(formatHistoryContent({ description: 'Itching and bleeding for the past week.' })).toBe(
      'Itching and bleeding for the past week.',
    );
  });

  it('joins a multi-key object as "Label: value; Label: value"', () => {
    expect(formatHistoryContent({ sunbedUse: 'frequent', occupationalExposure: 'high' })).toBe(
      'Sunbed Use: frequent; Occupational Exposure: high',
    );
  });
});

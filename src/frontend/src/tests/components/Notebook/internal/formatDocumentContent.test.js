import { formatKeyLabel, formatHistoryContent } from '../../../../components/Notebook/internal/formatDocumentContent';

describe('formatKeyLabel', () => {
  it('maps known content keys to their Polish label', () => {
    expect(formatKeyLabel('sunbedUse')).toBe('Korzystanie z solarium');
    expect(formatKeyLabel('occupationalExposure')).toBe('Ekspozycja zawodowa');
    expect(formatKeyLabel('description')).toBe('Opis');
  });

  it('falls back to spaced, capitalized title-case for unknown keys', () => {
    expect(formatKeyLabel('someOtherKey')).toBe('Some Other Key');
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
      'Korzystanie z solarium: frequent; Ekspozycja zawodowa: high',
    );
  });
});

import { formatKeyLabel, formatHistoryContent } from '../../../../components/Notebook/internal/formatDocumentContent';

describe('formatKeyLabel', () => {
  it('returns the known Polish label for a recognized key', () => {
    expect(formatKeyLabel('sunbedUse')).toBe('Korzystanie z solarium');
    expect(formatKeyLabel('occupationalExposure')).toBe('Narażenie zawodowe');
  });

  it('falls back to inserting a space before each uppercase letter and capitalizing the first character for an unrecognized key', () => {
    expect(formatKeyLabel('someUnknownKey')).toBe('Some Unknown Key');
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
      'Korzystanie z solarium: frequent; Narażenie zawodowe: high',
    );
  });
});

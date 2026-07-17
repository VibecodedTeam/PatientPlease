/**
 * EXAMINATION_RESULTS documents store `shopItemId` in their content so the backend can match
 * a successful CaseExamination to the right document (see services/round.ts, services/examination.ts).
 * That id is purely internal bookkeeping and must never reach the frontend — shared here so every
 * response path that can surface a case document (round fetch, chat reveal) strips it the same way.
 */
export function toDisplayDocumentContent(document: { type: string; content: unknown }): unknown {
  if (document.type === 'EXAMINATION_RESULTS') {
    const findings = (document.content as { findings?: string } | null)?.findings;
    return findings !== undefined ? { findings } : document.content;
  }
  return document.content;
}

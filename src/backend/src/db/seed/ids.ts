/** Deterministic, human-traceable UUIDs for seed rows, so re-running the seed can upsert by id
 * instead of relying on natural keys that don't exist on every content model (see CaseDocument,
 * which has no unique business key). `domain` groups ids by seed file, `index` is 1-based. */
export function seedId(domain: string, index: number): string {
  return `00000000-0000-4000-8000-000000${domain}${String(index).padStart(4, '0')}`;
}

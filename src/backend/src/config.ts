export function resolvePort(value: string | undefined, fallback: number): number {
  return value ? Number(value) : fallback;
}

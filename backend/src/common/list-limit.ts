/**
 * Row caps for list endpoints.
 *
 * Every list query in this codebase was unbounded, so a client asking for the
 * site diary in month 30 of a 30-month contract would be served every row ever
 * written. Bounding it in the service — not only in the client — means an old
 * mobile build cannot pull the whole table either.
 *
 * These are caps, not pagination. Callers that genuinely need the full history
 * (report generation, exports) should query directly rather than raising this.
 */
export const DEFAULT_LIST_LIMIT = 200;
export const MAX_LIST_LIMIT = 1000;

/** Clamps a caller-supplied limit into [1, MAX_LIST_LIMIT], defaulting when absent or unparseable. */
export function resolveListLimit(raw?: string | number | null): number {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_LIST_LIMIT;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.trunc(n), MAX_LIST_LIMIT);
}

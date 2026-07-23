/**
 * Keeps the last successful response visible while a filter, search term, tab,
 * or cursor produces a new query key.
 *
 * Use this only for collection and aggregate queries. Detail queries must clear
 * when their resource id changes so data from one resource is never presented
 * as another.
 */
export function retainPreviousQueryData<T>(
  previousData: T | undefined,
): T | undefined {
  return previousData;
}

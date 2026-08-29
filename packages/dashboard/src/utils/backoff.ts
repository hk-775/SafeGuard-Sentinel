export function computeBackoff(
  attempt: number,
  initialBackoff: number = 1000,
  maxBackoff: number = 30000
): number {
  return Math.min(initialBackoff * Math.pow(2, attempt), maxBackoff);
}

// Precise binary MiB, e.g. "16,628.3 MiB" - used as the small-print detail
// line under a rounded-GB headline figure.
export function formatMiB(bytes: number): string {
  const mib = bytes / (1024 * 1024);
  return `${mib.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MiB`;
}

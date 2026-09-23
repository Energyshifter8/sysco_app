// TEMPORARY profiling helper — removed after the before/after measurement.
declare global {
  interface Window {
    __probe?: { open: number; peak: number; opened: number; closed: number; log: string[] };
  }
}

export function trackListener(name: string) {
  if (typeof window === "undefined") return () => {};
  const p = (window.__probe ??= { open: 0, peak: 0, opened: 0, closed: 0, log: [] });
  p.open += 1;
  p.opened += 1;
  p.peak = Math.max(p.peak, p.open);
  p.log.push(`+ ${name} (open=${p.open})`);
  return () => {
    p.open -= 1;
    p.closed += 1;
    p.log.push(`- ${name} (open=${p.open})`);
  };
}

export type VivahTraceDetail = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    __vivahTrace?: Array<{
      t: number;
      event: string;
      detail?: VivahTraceDetail;
    }>;
  }
}

/** Structured timeline events for WebKit/manual testing (console + window buffer). */
export function vivahTrace(event: string, detail?: VivahTraceDetail) {
  if (typeof window === "undefined") return;
  const payload = { t: performance.now(), event, detail };
  window.__vivahTrace ??= [];
  window.__vivahTrace.push(payload);
  window.dispatchEvent(new CustomEvent("vivah-trace", { detail: payload }));
}

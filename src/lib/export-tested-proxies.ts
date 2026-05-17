/**
 * Helpers for exporting tested proxy results to text/CSV.
 *
 * **Raw lines** — one `Proxy.raw` per line, suitable for pasting back into the app.
 *
 * To save files to disk, use `saveTextWithPicker` from `@/lib/save-text-file`
 * (Tauri’s webview often ignores blob + programmatic download; the save helper uses a native dialog there).
 *
 * **CSV columns** (header row is always present):
 * - `raw` — original input string
 * - `formatted` — normalized display string
 * - `protocol` — detected protocol
 * - `status` — `ok` | `fail` | `unknown`
 * - `latency` — milliseconds when measured (empty if not applicable)
 * - `exit_ip` — exit IP from simple geo lookup when present
 * - `country` — country name from simple data when present
 * - `error_code` — error code when failed
 * - `error_message` — error message when failed
 */

import type { Proxy } from "@/types";

/** Which tested rows to include when exporting (all, or only successes / failures). */
export type ExportScope = "all" | "ok" | "fail";

/**
 * Filters proxies for export. Uses `status` only; `unknown` is included only when scope is `all`.
 */
export function filterByStatus(
  proxies: Proxy[],
  scope: ExportScope
): Proxy[] {
  if (scope === "all") return proxies;
  return proxies.filter((p) => p.status === scope);
}

/**
 * One `raw` proxy string per line; use for TXT paste/import round-trips.
 */
export function toRawLines(proxies: Proxy[]): string {
  return proxies.map((p) => p.raw).join("\n");
}

function csvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export type ToCsvOptions = {
  /** ISO timestamp added as a comment in the first line (optional, for traceability). */
  includeGeneratedComment?: boolean;
};

/**
 * Builds a CSV document with a fixed header row. Empty cells when data is missing.
 */
export function toCsv(proxies: Proxy[], options?: ToCsvOptions): string {
  const header = [
    "raw",
    "formatted",
    "protocol",
    "status",
    "latency",
    "exit_ip",
    "country",
    "error_code",
    "error_message",
  ];

  const rows: string[][] = [header];

  for (const p of proxies) {
    rows.push([
      csvCell(p.raw),
      csvCell(p.formatted),
      csvCell(p.protocol),
      csvCell(p.status),
      csvCell(p.latency !== undefined ? p.latency : ""),
      csvCell(p.simpleData?.ip ?? ""),
      csvCell(p.simpleData?.country ?? ""),
      csvCell(p.error?.code ?? ""),
      csvCell(p.error?.message ?? ""),
    ]);
  }

  const body = rows.map((line) => line.join(",")).join("\r\n");
  if (options?.includeGeneratedComment) {
    return `# generated ${new Date().toISOString()}\r\n${body}`;
  }
  return body;
}

/** @internal — narrow status for labels in UI */
export function scopeLabel(scope: ExportScope): string {
  switch (scope) {
    case "all":
      return "all";
    case "ok":
      return "working";
    case "fail":
      return "failed";
  }
}

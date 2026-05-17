import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export type SaveTextOutcome = "saved" | "cancelled";

/**
 * Tauri’s webview does not reliably honor programmatic `<a download>` + blob URLs.
 * On desktop we open a native Save dialog and write via the fs plugin; in the
 * browser we keep the anchor + blob approach.
 */
export async function saveTextWithPicker(
  suggestedFilename: string,
  contents: string,
  kind: "txt" | "csv"
): Promise<SaveTextOutcome> {
  if (isTauri()) {
    const filters =
      kind === "csv"
        ? [{ name: "CSV", extensions: ["csv"] as string[] }]
        : [{ name: "Text", extensions: ["txt"] as string[] }];

    const path = await save({
      defaultPath: suggestedFilename,
      filters,
    });

    if (path === null) return "cancelled";

    await writeTextFile(path, contents);
    return "saved";
  }

  const mimeType =
    kind === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";
  triggerBrowserDownload(suggestedFilename, contents, mimeType);
  return "saved";
}

function triggerBrowserDownload(
  filename: string,
  contents: string,
  mimeType: string
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

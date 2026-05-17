import { isTauri } from "@tauri-apps/api/core";
import { writeText as tauriWriteText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Writes text to the system clipboard. In the Tauri shell, uses the native
 * clipboard plugin so large proxy lists behave reliably.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (!text) return;
  if (isTauri()) {
    await tauriWriteText(text);
  } else {
    await navigator.clipboard.writeText(text);
  }
}

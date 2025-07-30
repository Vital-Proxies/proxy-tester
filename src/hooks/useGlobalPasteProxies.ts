import { useEffect } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { convertRawStringsToProxy } from "@/lib/utils";
import { toast } from "sonner";
import { isTauri } from "@tauri-apps/api/core";
import { readText } from "@tauri-apps/plugin-clipboard-manager";

export function useGlobalPasteProxies() {
  const { addLoadedProxies, testStatus } = useProxyTesterStore();

  useEffect(() => {
    const handleGlobalPaste = async (event: KeyboardEvent) => {
      // Check if Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      const isCommandV = (event.metaKey || event.ctrlKey) && event.key === "v";

      if (!isCommandV) return;

      // Don't interfere if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTypingInInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true" ||
          (activeElement as HTMLElement).isContentEditable);

      if (isTypingInInput) return;

      // Don't paste while test is running
      if (testStatus === "testing" || testStatus === "stopping") {
        toast.error("Test in progress", {
          description: "Can't load new proxies while testing is active",
          duration: 3000,
        });
        return;
      }

      try {
        // Read clipboard content
        const clipboardText = isTauri()
          ? await readText()
          : await navigator.clipboard.readText();

        if (!clipboardText.trim()) {
          return;
        }

        // Split clipboard content into lines and filter out empty ones
        const lines = clipboardText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          return;
        }

        // Convert to proxy objects
        const processedProxies = convertRawStringsToProxy(lines);

        if (processedProxies.length > 0) {
          // Prevent the default paste behavior
          event.preventDefault();
          event.stopPropagation();

          // Replace proxies in store
          addLoadedProxies(processedProxies);

          // Show success toast with better message
          toast.success(
            `${processedProxies.length} ${
              processedProxies.length === 1 ? "proxy" : "proxies"
            } loaded successfully`,
            {
              duration: 2000,
            }
          );
        } else {
          toast.error("No valid proxies found", {
            description:
              "The clipboard content doesn't match any supported proxy format.",
            duration: 2000,
          });
        }
      } catch (error) {
        // Handle clipboard access errors
        let title = "Clipboard access blocked";
        let description = "Unable to read your clipboard content";

        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            title = "Permission required";
            description = error.message;
          } else if (error.name === "AbortError") {
            // User cancelled clipboard access, don't show error
            return;
          }
        }

        toast.error(title, {
          description,
          duration: 4000,
        });
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleGlobalPaste);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleGlobalPaste);
    };
  }, [addLoadedProxies, testStatus]);
}

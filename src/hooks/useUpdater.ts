"use-client";

import { useState, useEffect, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "@tauri-apps/api/core";
import { UpdateStatus } from "@/types";

export function useUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("PENDING");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const isUpdateAvailable = !!update;

  useEffect(() => {
    // Only run in Tauri environment
    if (!isTauri()) {
      console.log("Web environment detected. Update checking disabled.");
      return;
    }

    const doCheckUpdate = async () => {
      try {
        const result = await check();

        if (result) {
          setUpdate(result);
        } else {
          console.log(
            "You are running the latest version or have skipped this update."
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.error("Update check failed:", e);
        setError(e.toString());
      }
    };

    doCheckUpdate();
  }, []);

  const startInstall = useCallback(async () => {
    if (!update) return;

    setError(null);
    setStatus("DOWNLOADING");

    let downloaded = 0;
    let contentLength = 0;

    try {
      await update.downloadAndInstall((progressEvent) => {
        switch (progressEvent.event) {
          case "Started":
            contentLength = progressEvent.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += progressEvent.data.chunkLength;
            const percent = Math.round((downloaded / contentLength) * 100);
            setDownloadProgress(percent);
            console.log(`Downloaded ${percent}%`);
            break;
          case "Finished":
            setStatus("INSTALLING");
            setDownloadProgress(100);
            console.log("Download finished, installing...");
            break;
        }
      });

      console.log("Update installed successfully");
      setStatus("DONE");
      await relaunch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("Installation failed:", e);
      setError(e.toString());
      setStatus("ERROR");
    }
  }, [update]);

  const closeDialog = () => {
    setShowDialog(false);
  };

  return {
    update,
    status,
    downloadProgress,
    error,
    startInstall,
    closeDialog,
    showDialog,
    setShowDialog,
    isUpdateAvailable,
  };
}

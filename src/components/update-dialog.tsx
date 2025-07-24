"use client";

import { useUpdater } from "@/hooks/useUpdater";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

type UpdateDialogProps = {
  updater: ReturnType<typeof useUpdater>;
};
export default function UpdateDialog({ updater }: UpdateDialogProps) {
  const {
    update,
    status,
    downloadProgress,
    error,
    startInstall,
    closeDialog,
    showDialog,
    setShowDialog,
  } = updater;

  if (!update) {
    return null;
  }

  const isInstalling = status === "DOWNLOADING" || status === "INSTALLING";

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Available!</AlertDialogTitle>
          <AlertDialogDescription>
            A new version ({update.version}) is available.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="prose prose-sm dark:prose-invert max-h-48 overflow-y-auto rounded-md border p-4">
          <pre className="font-mono">
            {update.body || "No release notes provided."}
          </pre>
        </div>

        {isInstalling && (
          <div className="flex flex-col gap-2 pt-4 w-full">
            <Progress value={downloadProgress} />
            <p className="text-center text-xs text-muted-foreground">
              {status === "DOWNLOADING"
                ? `Downloading... ${downloadProgress}%`
                : "Download complete. Installing..."}
            </p>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}

        <AlertDialogFooter>
          <Button
            onClick={closeDialog}
            variant="transparent"
            disabled={isInstalling}
          >
            Later
          </Button>

          <Button onClick={startInstall} disabled={isInstalling}>
            {isInstalling ? "Installing..." : "Install Now"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

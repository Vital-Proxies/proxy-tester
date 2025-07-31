"use client";
import { useEffect } from "react";
import { useUpdater } from "@/hooks/useUpdater";
import { ArrowDownToLine } from "lucide-react";
import { Button } from "../ui/button";
import UpdateDialog from "./update-dialog";
import useAppVersion from "@/hooks/useAppVersion";

export default function UpdateChecker() {
  const appVersion = useAppVersion();
  const updater = useUpdater();
  const { update, setShowDialog } = updater;

  const isUpdateAvailable = !!update;

  useEffect(() => {
    if (update && appVersion && update.version !== appVersion) {
      setShowDialog(true);
    }
  }, [update, appVersion, setShowDialog]);

  if (!isUpdateAvailable) {
    return (
      <span className="text-xs font-mono text-text-secondary px-2">
        {appVersion ? `v${appVersion}` : "Checking for updates..."}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-mono text-text-secondary px-4">
        v{appVersion}
      </span>

      {isUpdateAvailable && (
        <>
          <Button
            variant="transparent"
            size="lg"
            className="animate-fade-in"
            onClick={() => setShowDialog(true)}
          >
            <ArrowDownToLine className="mr-2 size-3" />
            Update to v{update?.version}
          </Button>

          <UpdateDialog updater={updater} />
        </>
      )}
    </div>
  );
}

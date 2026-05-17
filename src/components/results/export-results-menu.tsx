"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Proxy } from "@/types";
import { Clipboard, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { useProxyTesterStore } from "@/store/proxy";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyTextToClipboard } from "@/lib/clipboard-write";
import { formatUnknownError } from "@/lib/format-error";
import { saveTextWithPicker } from "@/lib/save-text-file";
import {
  filterByStatus,
  scopeLabel,
  toCsv,
  toRawLines,
  type ExportScope,
} from "@/lib/export-tested-proxies";
import { cn } from "@/lib/utils";

const EXPORT_SCOPES: ExportScope[] = ["all", "ok", "fail"];
const MENU_GAP = 8;

type ExportActionKind = "copy" | "txt";

function exportFilename(scope: ExportScope, ext: "txt" | "csv"): string {
  const date = new Date().toISOString().slice(0, 10);
  const scopePart =
    scope === "all" ? "all" : scopeLabel(scope).replace(/\s+/g, "-");
  return `proxy-export-${date}-${scopePart}.${ext}`;
}

function scopeCounts(proxies: Proxy[]) {
  return {
    all: proxies.length,
    ok: filterByStatus(proxies, "ok").length,
    fail: filterByStatus(proxies, "fail").length,
  } satisfies Record<ExportScope, number>;
}

function scopeName(scope: ExportScope): string {
  if (scope === "all") return "All";
  return scopeLabel(scope);
}

function ExportGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="py-0.5">
      <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        <Icon className="size-3.5 shrink-0 text-accent" />
        {label}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ScopeRow({
  label,
  count,
  disabled,
  onClick,
}: {
  label: string;
  count: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled || count === 0}
      onClick={() => void onClick()}
      className={cn(
        "flex w-full cursor-pointer items-center rounded-md py-1 pl-6 pr-2 text-sm",
        "text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      <span className="flex-1 text-left capitalize">{label}</span>
      <span className="font-mono text-xs tabular-nums text-text-muted">
        {count}
      </span>
    </button>
  );
}

function useAnchoredPosition(
  open: boolean,
  anchorRef: RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.bottom + MENU_GAP,
      left: rect.left,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return position;
}

export default function ExportResultsMenu() {
  const { testedProxies, testStatus } = useProxyTesterStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredPosition(open, anchorRef);

  const blocked =
    testStatus === "testing" ||
    testStatus === "stopping" ||
    testedProxies.length === 0;

  const counts = useMemo(() => scopeCounts(testedProxies), [testedProxies]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleCopy = async (scope: ExportScope) => {
    const list = filterByStatus(testedProxies, scope);
    const text = toRawLines(list);
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await copyTextToClipboard(text);
      toast.success(`Copied ${list.length}`);
      setOpen(false);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownloadTxt = async (scope: ExportScope) => {
    const list = filterByStatus(testedProxies, scope);
    const text = toRawLines(list);
    if (!text) {
      toast.error("Nothing to save");
      return;
    }
    const filename = exportFilename(scope, "txt");
    try {
      const outcome = await saveTextWithPicker(filename, text, "txt");
      if (outcome === "cancelled") return;
      toast.success(`Saved ${list.length}`);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Save failed", { description: formatUnknownError(err) });
    }
  };

  const handleDownloadCsv = async () => {
    const list = filterByStatus(testedProxies, "all");
    const csv = toCsv(list);
    const filename = exportFilename("all", "csv");
    try {
      const outcome = await saveTextWithPicker(filename, csv, "csv");
      if (outcome === "cancelled") return;
      toast.success("CSV saved");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Save failed", { description: formatUnknownError(err) });
    }
  };

  const runExport = (kind: ExportActionKind, scope: ExportScope) => {
    if (busy) return;
    setBusy(true);
    const done = () => setBusy(false);
    if (kind === "copy") {
      void handleCopy(scope).finally(done);
    } else {
      void handleDownloadTxt(scope).finally(done);
    }
  };

  const runCsv = () => {
    if (busy) return;
    setBusy(true);
    void handleDownloadCsv().finally(() => setBusy(false));
  };

  const toggleOpen = () => {
    if (blocked) return;
    setOpen((v) => !v);
  };

  const disabledReason =
    testedProxies.length === 0
      ? "Run a test first"
      : testStatus === "testing" || testStatus === "stopping"
        ? "Wait for test to finish"
        : undefined;

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      disabled={blocked}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={toggleOpen}
      className={cn(
        blocked ? "text-gray-500" : "text-gray-400 hover:text-white",
        open && !blocked && "text-white",
      )}
    >
      <Download className="w-4 h-4 mr-2" />
      Export
      {!blocked && counts.all > 0 && (
        <span className="ml-1 font-mono text-xs tabular-nums text-text-muted">
          {counts.all}
        </span>
      )}
    </Button>
  );

  const menu = (
    <AnimatePresence>
      {open && !blocked && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{ top: position.top, left: position.left }}
          className={cn(
            "fixed z-50 w-56 origin-top-left overflow-hidden rounded-2xl",
            "border border-white/20 bg-[rgba(255,255,255,0.01)] shadow-xl backdrop-blur-3xl",
          )}
        >
          <div className="max-h-[min(70vh,24rem)] overflow-y-auto p-1.5 custom-scrollbar">
            <ExportGroup icon={Clipboard} label="Copy">
              {EXPORT_SCOPES.map((scope) => (
                <ScopeRow
                  key={`copy-${scope}`}
                  label={scopeName(scope)}
                  count={counts[scope]}
                  disabled={busy}
                  onClick={() => runExport("copy", scope)}
                />
              ))}
            </ExportGroup>

            <div className="my-1 border-t border-white/10" role="separator" />

            <ExportGroup icon={FileText} label="Save as TXT">
              {EXPORT_SCOPES.map((scope) => (
                <ScopeRow
                  key={`txt-${scope}`}
                  label={scopeName(scope)}
                  count={counts[scope]}
                  disabled={busy}
                  onClick={() => runExport("txt", scope)}
                />
              ))}
            </ExportGroup>

            <div className="my-1 border-t border-white/10" role="separator" />

            <ExportGroup icon={FileSpreadsheet} label="CSV">
              <ScopeRow
                label="Full export"
                count={counts.all}
                disabled={busy}
                onClick={runCsv}
              />
            </ExportGroup>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div ref={anchorRef} className="relative">
        {blocked && disabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{triggerButton}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabledReason}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )}
      </div>

      {mounted ? createPortal(menu, document.body) : null}
    </>
  );
}

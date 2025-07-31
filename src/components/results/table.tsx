"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useProxyTesterStore } from "@/store/proxy";
import { Table, TableHeader, TableCell, TableRow } from "../ui/table";
import { Loader2, Clock } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import ResultsTableHead from "./table-head";
import ResultsTableRowSimple from "./table-row-simple";
import ResultsTableRowPro from "./table-row-pro";
import React, { useEffect, useState, useMemo } from "react";
import { Proxy, ProxyTesterOptions } from "@/types";

const EmptyStateWaiting = () => (
  <div className="flex flex-col items-center justify-center h-64 px-8">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-400/30 border-t-blue-400 flex items-center justify-center">
        <Loader2 className="text-blue-300" size={20} />
      </div>
    </motion.div>
    <h3 className="text-lg font-medium text-white mb-2 mt-3">
      Testing Proxies
    </h3>
    <p className="text-gray-400 text-center max-w-md">
      Please wait while we test your proxies for connectivity and performance.
    </p>
  </div>
);

const EmptyStateIdle = ({ activeMode }: { activeMode: string }) => {
  const [platformKey, setPlatformKey] = useState("Ctrl");
  useEffect(() => {
    const detectPlatform = async () => {
      if (await isTauri()) {
        try {
          const os = await platform();
          setPlatformKey(os === "macos" ? "⌘" : "Ctrl");
        } catch {
          /* ignore */
        }
      }
    };
    detectPlatform();
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-64 px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-xl font-semibold text-text-primary mb-3">
          Ready to Test
        </h3>
        <p className="text-text-secondary max-w-sm">
          Load your proxy list to begin testing in{" "}
          <span className="font-semibold capitalize text-accent">
            {activeMode}
          </span>{" "}
          mode.
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 text-sm mt-6"
        >
          <span className="text-text-secondary">Press</span>
          <kbd className="px-2 py-1 bg-white/3 border border-white/15 rounded-md text-xs font-mono text-white">
            {platformKey} + V
          </kbd>
          <span className="text-text-secondary">to load proxies</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

const QueuedProxiesTable = React.memo(({ proxies }: { proxies: Proxy[] }) => (
  <Table className="w-full">
    <TableHeader className="bg-white/10 border-b border-white/20">
      <ResultsTableHead />
    </TableHeader>
    <tbody className="divide-y divide-white/5">
      <AnimatePresence>
        {proxies.map((proxy, index) => (
          <motion.tr
            key={`loaded-${proxy.raw}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.01 }}
            className="opacity-70"
          >
            <TableCell className="font-mono text-sm max-w-[210px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate block">{proxy.formatted}</span>
                </TooltipTrigger>
                <TooltipContent>{proxy.raw}</TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell>
              <div className="w-fit rounded-md px-2 py-0.5 text-xs font-semibold bg-gray-600/10 text-gray-400 border-gray-600/20 border">
                {proxy.protocol === "unknown"
                  ? "Auto"
                  : proxy.protocol.toUpperCase()}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 w-fit px-2.5 rounded-lg py-1 text-xs font-semibold border bg-yellow-600/10 text-yellow-400 border-yellow-600/20">
                <span>Queued</span>
              </div>
            </TableCell>
            <TableCell colSpan={10} className="text-center text-text-muted">
              Waiting to be tested
            </TableCell>
          </motion.tr>
        ))}
      </AnimatePresence>
    </tbody>
  </Table>
));
QueuedProxiesTable.displayName = "QueuedProxiesTable";

const TestedProxiesTable = React.memo(
  ({ proxies, options }: { proxies: Proxy[]; options: ProxyTesterOptions }) => (
    <Table className="w-full">
      <TableHeader className="bg-white/10 border-b border-white/20">
        <ResultsTableHead />
      </TableHeader>
      <tbody className="divide-y divide-white/5">
        <AnimatePresence>
          {proxies.map((proxy) => (
            <motion.tr
              key={`tested-${proxy.raw}`}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 50 }}
              className="hover:bg-white/5"
            >
              {options.activeMode === "simple" ? (
                <ResultsTableRowSimple proxy={proxy} options={options} />
              ) : (
                <ResultsTableRowPro proxy={proxy} options={options} />
              )}
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    </Table>
  )
);
TestedProxiesTable.displayName = "TestedProxiesTable";

// --- Main ResultsTable Component ---

export default function ResultsTable() {
  const { testStatus, options, loadedProxies, testedProxies } =
    useProxyTesterStore();

  const renderedContent = useMemo(() => {
    const isTestingActive =
      testStatus === "testing" || testStatus === "stopping";
    const hasLoadedProxies = loadedProxies.length > 0;
    const hasTestedProxies = testedProxies.length > 0;

    if (isTestingActive) {
      return !hasTestedProxies ? (
        <EmptyStateWaiting />
      ) : (
        <TestedProxiesTable proxies={testedProxies} options={options} />
      );
    }
    // STATE 2: Test is finished/idle, but there are results.
    if (hasTestedProxies) {
      return <TestedProxiesTable proxies={testedProxies} options={options} />;
    }
    // STATE 3: Proxies are loaded but not yet tested.
    if (hasLoadedProxies) {
      return <QueuedProxiesTable proxies={loadedProxies} />;
    }
    // STATE 4: Default initial state.
    return <EmptyStateIdle activeMode={options.activeMode} />;
  }, [testStatus, loadedProxies, testedProxies, options]);

  return (
    <div className="w-full space-y-4">
      <div className="rounded-lg border border-white/10 backdrop-blur-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <TooltipProvider>{renderedContent}</TooltipProvider>
        </div>
      </div>
    </div>
  );
}

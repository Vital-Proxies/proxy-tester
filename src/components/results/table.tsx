// Updated ResultsTable.tsx - cleaner table design
"use client";

import { motion, AnimatePresence } from "framer-motion";
import ResultsTableRowSimple from "./table-row-simple";
import ResultsTableRowPro from "./table-row-pro";
import { useProxyTesterStore } from "@/store/proxy";
import { Table, TableHeader } from "../ui/table";
import { Loader2, CheckCircle } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import { TooltipProvider } from "../ui/tooltip";
import ResultsTableHead from "./table-head";
import { useEffect, useState } from "react";

const EmptyStateWaiting = () => (
  <div className="flex flex-col items-center justify-center h-64 px-8">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="mb-4"
    >
      <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-400/30 border-t-blue-400 flex items-center justify-center">
        <Loader2 className="text-blue-300" size={20} />
      </div>
    </motion.div>
    <h3 className="text-lg font-medium text-white mb-2">Testing Proxies</h3>
    <p className="text-gray-400 text-center max-w-md">
      Analyzing your proxies for performance and reliability...
    </p>
  </div>
);

const EmptyStateIdle = ({ activeMode }: { activeMode: string }) => {
  const [platformKey, setPlatformKey] = useState("Ctrl");

  useEffect(() => {
    const detectPlatform = async () => {
      if (isTauri()) {
        try {
          const os = platform();
          setPlatformKey(os === "macos" ? "⌘" : "Ctrl");
        } catch {
          setPlatformKey("Ctrl");
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
        <p className="text-text-secondary text-center max-w-sm">
          Load your proxy list and run a test in{" "}
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
          <kbd className="px-2 py-1 bg-white/3 border border-white/15 rounded-md text-xs font-mono text-white backdrop-blur-sm">
            {platformKey} + V
          </kbd>
          <span className="text-text-secondary">
            anywhere to load your proxies
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};
export default function ResultsTable() {
  const { testedProxies, options, testStatus } = useProxyTesterStore();

  return (
    <div className="w-full space-y-4">
      {/* Table Container */}
      <div className="rounded-lg border border-white/10 backdrop-blur-3xl overflow-hidden">
        {testedProxies.length === 0 ? (
          /* Empty States */
          testStatus === "testing" ? (
            <EmptyStateWaiting />
          ) : (
            <EmptyStateIdle activeMode={options.activeMode} />
          )
        ) : (
          /* Table with Results */
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table className="w-full">
                <TableHeader className="bg-white/10 border-b border-white/20">
                  <ResultsTableHead />
                </TableHeader>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {testedProxies.map((proxy, index) => (
                      <motion.tr
                        key={`${proxy.raw}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{
                          delay: index * 0.02,
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        {options.activeMode === "simple" ? (
                          <ResultsTableRowSimple
                            proxy={proxy}
                            options={options}
                          />
                        ) : (
                          <ResultsTableRowPro proxy={proxy} options={options} />
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </Table>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

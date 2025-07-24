"use client";

import { motion } from "framer-motion";
import ProxyListRow from "./proxy-list-row";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useProxyTesterStore } from "@/store/proxy";
import { Table, TableHeader, TableRow, TableHead } from "./ui/table";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export default function ProxyList() {
  const { testedProxies, options, testStatus } = useProxyTesterStore();

  if (testStatus === "testing" && testedProxies.length === 0) {
    return (
      <div className="flex h-80 flex-row items-center justify-center rounded-md border text-text-secondary">
        <Loader2 className="animate-spin mr-2" />
        <p className="block">Waiting for the first results to come in...</p>
      </div>
    );
  }

  if (testedProxies.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-md border flex-col">
        <h3 className="text-text-primary">
          Results will appear here live as they are tested.
        </h3>
        <p className="text-text-muted">
          You need proxies?{" "}
          <Button
            onClick={() =>
              openUrl(
                "https://www.vital-proxies.com/?utm_source=vital-tester&utm_medium=app&utm_campaign=buy-proxies"
              )
            }
            className="text-text-secondary"
            variant={"link"}
          >
            Try Vital Proxies for free
          </Button>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md">
      <Table>
        <TableHeader className="bg-accent sticky w-full top-0 z-10">
          <TableRow>
            <TableHead className="text-left text-sm w-full">Proxy</TableHead>
            <TableHead className="text-left text-sm w-[120px]">
              Status
            </TableHead>
            {options.latencyCheck && (
              <TableHead className="text-left text-sm">Latency</TableHead>
            )}
            {options.ipLookup && (
              <TableHead className="text-left text-sm">IP Address</TableHead>
            )}
            <TableHead className="text-right text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <motion.tbody>
          {testedProxies.map((proxy) => (
            <ProxyListRow
              key={proxy.raw}
              proxy={proxy}
              latencyCheck={options.latencyCheck}
              ipLookup={options.ipLookup}
            />
          ))}
        </motion.tbody>
      </Table>
    </div>
  );
}

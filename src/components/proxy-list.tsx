"use client";

import { motion } from "framer-motion";
import ProxyListRow from "./proxy-list-row";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
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
            onClick={() => {
              const url = "https://www.vital-proxies.com/?utm_source=vital-tester&utm_medium=app&utm_campaign=buy-proxies";
              if (isTauri()) {
                openUrl(url);
              } else {
                window.open(url, '_blank');
              }
            }}
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
            <TableHead className="text-left text-sm min-w-[200px]">Proxy</TableHead>
            <TableHead className="text-left text-sm w-[80px]">Type</TableHead>
            <TableHead className="text-left text-sm w-[100px]">Status</TableHead>
            {options.latencyCheck && (
              <TableHead className="text-left text-sm w-[100px]">Latency</TableHead>
            )}
            {options.proMode && (
              <>
                <TableHead className="text-left text-sm w-[90px]">1st Conn</TableHead>
                <TableHead className="text-left text-sm w-[110px]">Next Conn</TableHead>
                <TableHead className="text-left text-sm w-[60px]">DNS</TableHead>
                <TableHead className="text-left text-sm w-[60px]">TCP</TableHead>
                <TableHead className="text-left text-sm w-[60px]">TLS</TableHead>
                <TableHead className="text-left text-sm w-[60px]">Conns</TableHead>
              </>
            )}
            {options.ipLookup && (
              <TableHead className="text-left text-sm">IP Address</TableHead>
            )}
            <TableHead className="text-right text-sm w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <motion.tbody>
          {testedProxies.map((proxy, index) => (
            <ProxyListRow
              key={`${proxy.raw}-${index}`}
              proxy={proxy}
              latencyCheck={options.latencyCheck}
              ipLookup={options.ipLookup}
              proMode={options.proMode}
            />
          ))}
        </motion.tbody>
      </Table>
    </div>
  );
}

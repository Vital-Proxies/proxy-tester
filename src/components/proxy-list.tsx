"use client";

import { motion } from "framer-motion";
import ProxyListRow from "./proxy-list-row";
import { useProxyTesterStore } from "@/store/proxy";
import { Table, TableHeader, TableRow, TableHead } from "./ui/table";
import { Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

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
      <div className="flex h-80 items-center justify-center rounded-md border">
        <p className="text-text-muted">
          Results will appear here live as they are tested.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md">
      <Table className="w-full">
        <TableHeader className="bg-accent sticky top-0 z-10">
          <TableRow>
            <TableHead className="text-left text-sm w-[200px]">Proxy</TableHead>
            <TableHead className="text-left text-sm w-[65px]">Type</TableHead>
            <TableHead className="text-left text-sm w-[70px]">Status</TableHead>
            {options.proMode && (
              <>
                <TableHead className="text-left text-sm w-[65px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>1st Conn</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">First connection time</p>
                        <p className="text-xs mt-1">Initial connection with full handshake</p>
                        <p className="text-xs mt-2">Includes: DNS + TCP + Auth + TLS + Request</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-left text-sm w-[70px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>Next Conn</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">Subsequent connections</p>
                        <p className="text-xs mt-1">Reuses existing connection (no handshake)</p>
                        <p className="text-xs mt-2 text-green-300">♻️ Much faster due to session reuse!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-left text-sm w-[45px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>DNS</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">DNS Resolution Time</p>
                        <p className="text-xs mt-1">Time to convert proxy hostname to IP address</p>
                        <div className="text-xs text-gray-300 mt-2 space-y-1">
                          <p>🌐 <b>What is DNS?</b></p>
                          <p>• Like a phone book for the internet</p>
                          <p>• Converts names (proxy.com) to numbers (192.168.1.1)</p>
                          <p>• First lookup can be 20-100ms</p>
                          <p>• Cached lookups are instant (0ms)</p>
                        </div>
                        <div className="text-xs text-purple-300 mt-2 space-y-1">
                          <p>⚡ <b>Why can it be slow?</b></p>
                          <p>• Your DNS server is far away</p>
                          <p>• DNS server is overloaded</p>
                          <p>• First time looking up this proxy</p>
                          <p>• ISP DNS issues</p>
                        </div>
                        <p className="text-xs text-blue-300 mt-2">💡 Tip: Use fast DNS like 8.8.8.8 or 1.1.1.1</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-left text-sm w-[75px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>Proxy</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">Direct proxy latency</p>
                        <p className="text-xs mt-1">Network delay between you and the proxy server</p>
                        <p className="text-xs mt-2 text-orange-300">🌍 Depends on your location relative to the proxy!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-left text-sm w-[45px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>TLS</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">TLS/SSL Handshake Time</p>
                        <p className="text-xs mt-1">Time to establish secure HTTPS connection</p>
                        <div className="text-xs text-gray-300 mt-2 space-y-1">
                          <p>🔒 <b>What is TLS?</b></p>
                          <p>• Encryption protocol for HTTPS sites</p>
                          <p>• Like setting up a secret code before talking</p>
                          <p>• Ensures your data is private and secure</p>
                          <p>• Only happens for HTTPS websites</p>
                        </div>
                        <div className="text-xs text-cyan-300 mt-2 space-y-1">
                          <p>⏱️ <b>Why does it take time?</b></p>
                          <p>• Multiple round trips to exchange keys</p>
                          <p>• Certificate verification</p>
                          <p>• Negotiating encryption methods</p>
                          <p>• Distance to target server matters</p>
                        </div>
                        <div className="text-xs text-green-300 mt-2">
                          <p>📊 <b>Normal values:</b></p>
                          <p>• 0ms for HTTP sites (no TLS)</p>
                          <p>• 20-50ms for nearby servers</p>
                          <p>• 100-300ms for distant servers</p>
                        </div>
                        <p className="text-xs text-yellow-300 mt-2">⚡ TLS 1.3 is faster than older versions!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-left text-sm w-[65px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>Response</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">Response Time</p>
                        <p className="text-xs mt-1">Time from request sent to response received</p>
                        <div className="text-xs text-gray-300 mt-2 space-y-1">
                          <p>📥 <b>What happens during response?</b></p>
                          <p>• Request travels to target server</p>
                          <p>• Server processes the request</p>
                          <p>• Response travels back through proxy</p>
                          <p>• Data is downloaded</p>
                        </div>
                        <div className="text-xs text-green-300 mt-2 space-y-1">
                          <p>🌍 <b>What affects response time?</b></p>
                          <p>• Distance: proxy → target server</p>
                          <p>• Target server processing speed</p>
                          <p>• Network quality along the path</p>
                          <p>• Size of response data</p>
                        </div>
                        <div className="text-xs text-blue-300 mt-2">
                          <p>💡 This is why proxy location matters!</p>
                          <p>A US proxy → US website = fast</p>
                          <p>A US proxy → Asian website = slower</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-left text-sm w-[45px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span>Conns</span>
                          <HelpCircle size={12} className="text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">Number of Connections Tested</p>
                        <p className="text-xs mt-1">How many requests were made through this proxy</p>
                        <div className="text-xs text-gray-300 mt-2 space-y-1">
                          <p>🔗 <b>Why test multiple connections?</b></p>
                          <p>• First connection is always slower</p>
                          <p>• Subsequent connections reuse the session</p>
                          <p>• Shows real-world performance</p>
                          <p>• Detects connection stability</p>
                        </div>
                        <p className="text-xs text-indigo-300 mt-2">💡 Pro Mode tests 3 connections by default to measure session reuse benefits</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              </>
            )}
            {options.ipLookup && (
              <TableHead className="text-left text-sm w-[120px]">IP/Location</TableHead>
            )}
            <TableHead className="text-right text-sm w-[90px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <motion.tbody>
          {testedProxies.map((proxy, index) => (
            <ProxyListRow
              key={`${proxy.raw}-${index}`}
              proxy={proxy}
              latencyCheck={false}
              ipLookup={options.ipLookup}
              proMode={options.proMode}
            />
          ))}
        </motion.tbody>
      </Table>
    </div>
  );
}

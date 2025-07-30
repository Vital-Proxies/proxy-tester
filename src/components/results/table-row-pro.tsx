"use client";
import { motion } from "framer-motion";
import {
  ProxyProtocol,
  ProxyTesterOptions,
  type Proxy,
  type ProxyStatus,
} from "@/types";

import { TableCell } from "../ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";
import TableRowActions from "./table-row-actions";

export default function ResultsTableRowPro({
  proxy,
  options,
}: {
  proxy: Proxy;
  options: ProxyTesterOptions;
}) {
  {
    const statusConfig: Record<
      ProxyStatus,
      { className: string; label: string }
    > = {
      ok: {
        className: "bg-green-600/10 text-green-400 border-green-600/20",
        label: "OK",
      },
      fail: {
        className: "bg-red-600/10 text-red-400 border-red-600/20",
        label: "Failed",
      },
      unknown: {
        className: "bg-gray-600/10 text-gray-400 border-gray-600/20",
        label: "N/A",
      },
    };

    const protocolConfig: Record<
      ProxyProtocol,
      { label: string; className: string }
    > = {
      http: {
        label: "HTTP",
        className: "bg-blue-600/10 text-blue-400 border-blue-600/20",
      },
      https: {
        label: "HTTPS",
        className: "bg-sky-600/10 text-sky-400 border-sky-600/20",
      },
      socks4: {
        label: "SOCKS4",
        className: "bg-purple-600/10 text-purple-400 border-purple-600/20",
      },
      socks5: {
        label: "SOCKS5",
        className: "bg-violet-600/10 text-violet-400 border-violet-600/20",
      },
      unknown: {
        label: "N/A",
        className: "bg-gray-600/10 text-gray-400 border-gray-600/20",
      },
    };

    const currentStatus = statusConfig[proxy.status];
    const currentProtocol = protocolConfig[proxy.protocol];

    return (
      <>
        <TableCell className="font-mono text-sm max-w-[210px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-full w-full cursor-pointer items-center justify-start">
                <span className="truncate block">{proxy.formatted}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2">
                <p className="font-medium">Full Proxy Address</p>
                <div className="max-w-xs break-all font-mono text-sm bg-white/5 p-2 rounded border">
                  {proxy.raw}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TableCell>

        <TableCell className="text-sm">
          <div
            className={cn(
              "w-fit rounded-md px-2 py-0.5 font-semibold tracking-wider",
              currentProtocol.className
            )}
          >
            {currentProtocol.label}
          </div>
        </TableCell>

        <TableCell>
          {proxy.status === "fail" && proxy.error ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-center gap-2  text-center px-2.5 rounded-lg py-1 text-xs font-semibold border cursor-help",
                    currentStatus.className
                  )}
                >
                  <span className="capitalize">{currentStatus.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-medium text-red-400">Connection Failed</p>
                  <p className="text-sm">{proxy.error.message}</p>
                  <div className="text-xs text-white/70 bg-white/5 p-2 rounded border-l-2 border-blue-400">
                    <p className="font-medium text-blue-400 mb-1">
                      💡 Suggestion:
                    </p>
                    <p>{proxy.error.suggestion}</p>
                  </div>
                  {proxy.error.protocolsTried &&
                    proxy.error.protocolsTried.length > 1 && (
                      <div className="text-xs text-white/60 border-t border-white/20 pt-2">
                        <p>
                          <strong>Protocols tested:</strong>{" "}
                          {proxy.error.protocolsTried.join(", ")}
                        </p>
                      </div>
                    )}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={cn(
                "flex items-center justify-center gap-2 w-fit text-center px-2.5 rounded-lg py-1 text-xs font-semibold border",
                currentStatus.className
              )}
            >
              <span className="capitalize">{currentStatus.label}</span>
            </div>
          )}
        </TableCell>

        {/* First Connection */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.firstConnectionTime != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-blue-400 font-semibold">
                  {Math.round(proxy.proDetails.firstConnectionTime)}ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-3">
                  <p className="font-medium">First Connection Setup Time</p>
                  <p className="text-sm text-white/80">
                    Complete time to establish connection and make first request
                  </p>

                  <div className="bg-white/5 p-3 rounded border">
                    <p className="font-medium text-blue-400 mb-2">
                      ⏱️ Timing Breakdown
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/70">DNS lookup:</span>
                        <span className="font-mono">
                          {proxy.proDetails.averageMetrics?.dnsLookupTime.toFixed(
                            1
                          )}
                          ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">TCP connect:</span>
                        <span className="font-mono">
                          {proxy.proDetails.averageMetrics?.tcpConnectTime.toFixed(
                            1
                          )}
                          ms
                        </span>
                      </div>
                      {(proxy.proDetails.averageMetrics?.tlsHandshakeTime ||
                        0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-white/70">TLS handshake:</span>
                          <span className="font-mono">
                            {proxy.proDetails.averageMetrics?.tlsHandshakeTime.toFixed(
                              1
                            )}
                            ms
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/70">Proxy setup:</span>
                        <span className="font-mono">
                          {(
                            (proxy.proDetails.averageMetrics
                              ?.proxyConnectTime || 0) +
                            (proxy.proDetails.averageMetrics?.proxyAuthTime ||
                              0)
                          ).toFixed(1)}
                          ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-white/60 italic">
                    This is a one-time cost when connecting to a new proxy
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Subsequent Connections */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.subsequentConnectionTime != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help text-green-400 flex items-center gap-1 font-semibold">
                  <span>
                    {Math.round(proxy.proDetails.subsequentConnectionTime)}ms
                  </span>
                  {proxy.proDetails.connections?.some(
                    (c) => c.sessionReused
                  ) && <span className="text-xs">♻️</span>}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-3">
                  <p className="font-medium">Subsequent Request Speed</p>
                  <p className="text-sm text-white/80">
                    Average time for requests after initial connection is
                    established
                  </p>

                  {proxy.proDetails.firstConnectionTime > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 p-3 rounded">
                      <p className="font-medium text-green-400 mb-2">
                        ⚡ Performance Improvement
                      </p>
                      <p className="text-sm">
                        <span className="font-mono text-green-300 text-lg">
                          {(
                            (1 -
                              proxy.proDetails.subsequentConnectionTime /
                                proxy.proDetails.firstConnectionTime) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                        <span className="text-white/70">
                          {" "}
                          faster than first connection
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="bg-white/5 p-3 rounded border">
                    <p className="font-medium text-cyan-400 mb-2">
                      🚀 Why It&apos;s Faster
                    </p>
                    <div className="text-xs text-white/70 space-y-1">
                      <p>• DNS lookup skipped (cached result)</p>
                      <p>• TCP connection reused (no handshake)</p>
                      <p>• TLS session resumed (no renegotiation)</p>
                      <p>• Proxy authentication cached</p>
                    </div>
                  </div>

                  <div className="text-xs text-white/60 italic">
                    This is the speed you&apos;ll experience for most requests
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* DNS */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics?.dnsLookupTime != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-purple-400 font-semibold">
                  {proxy.proDetails.averageMetrics.dnsLookupTime.toFixed(1)}ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-medium">DNS Resolution Time</p>
                  <p className="text-sm text-white/80">
                    Time to convert proxy hostname to IP address
                  </p>
                  <div className="text-xs text-white/70 space-y-1">
                    <p>• Queries DNS servers for proxy&apos;s IP</p>
                    <p>• Result gets cached for future requests</p>
                    <p>• High values may indicate slow DNS servers</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Proxy Latency */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics?.tcpConnectTime != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-orange-400 font-semibold">
                  {proxy.proDetails.averageMetrics.tcpConnectTime.toFixed(1)}ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-3">
                  <p className="font-medium">Network Latency to Proxy</p>
                  <p className="text-sm text-white/80">
                    Direct connection time between your device and the proxy
                    server
                  </p>

                  <div className="bg-white/5 p-3 rounded border">
                    <p className="font-medium text-orange-400 mb-2">
                      🌐 What Affects This
                    </p>
                    <div className="text-xs text-white/70 space-y-1">
                      <p>• Physical distance to proxy server</p>
                      <p>• Your internet connection quality</p>
                      <p>• Proxy server load and responsiveness</p>
                      <p>• Network routing between you and proxy</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded">
                    <p className="text-xs">
                      <span className="font-medium text-blue-400">
                        💡 Performance Guide:
                      </span>
                      <br />
                      <span className="text-white/70">
                        &lt;50ms = Excellent • 50-150ms = Good • &gt;150ms = May
                        feel slow
                      </span>
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* TLS */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics?.tlsHandshakeTime != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-cyan-400 font-semibold">
                  {proxy.proDetails.averageMetrics.tlsHandshakeTime.toFixed(1)}
                  ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-medium">TLS/SSL Handshake Time</p>
                  <p className="text-sm text-white/80">
                    Time to establish secure encrypted connection
                  </p>
                  <div className="text-xs text-white/70 space-y-1">
                    <p>• Certificate exchange and validation</p>
                    <p>• Encryption key negotiation</p>
                    <p>• Only applies to HTTPS proxies</p>
                    <p>• Modern TLS 1.3 is typically faster</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Response Time */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-green-400 font-semibold">
                  {Math.max(
                    0,
                    proxy.proDetails.averageMetrics.responseWaitTime +
                      proxy.proDetails.averageMetrics.responseDownloadTime
                  ).toFixed(1)}
                  ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-3">
                  <p className="font-medium">Request Processing Time</p>
                  <p className="text-sm text-white/80">
                    How long the proxy takes to fetch and deliver data from
                    target websites
                  </p>

                  <div className="bg-white/5 p-3 rounded border">
                    <p className="font-medium text-green-400 mb-2">
                      📊 Breakdown
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/70">Response wait:</span>
                        <span className="font-mono">
                          {Math.max(
                            0,
                            proxy.proDetails.averageMetrics.responseWaitTime
                          ).toFixed(1)}
                          ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Data download:</span>
                        <span className="font-mono">
                          {Math.max(
                            0,
                            proxy.proDetails.averageMetrics.responseDownloadTime
                          ).toFixed(1)}
                          ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded border">
                    <p className="font-medium text-yellow-400 mb-2">
                      🎯 What This Includes
                    </p>
                    <div className="text-xs text-white/70 space-y-1">
                      <p>• Proxy processing your request</p>
                      <p>• Proxy connecting to target website</p>
                      <p>• Target website response time</p>
                      <p>• Data transfer back through proxy</p>
                    </div>
                  </div>

                  <div className="text-xs text-white/60 italic">
                    Depends on both proxy performance and target website speed
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Number of Connections */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.connections?.length != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-indigo-400 font-semibold">
                  {proxy.proDetails.connections.length}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-medium">Test Connections Made</p>
                  <p className="text-sm text-white/80">
                    Number of test requests sent through this proxy
                  </p>
                  <div className="text-xs text-white/70 space-y-1">
                    <p>• Multiple connections test consistency</p>
                    <p>• First connection includes full setup</p>
                    <p>• Additional connections test reuse efficiency</p>
                    <p>• More connections = better statistical accuracy</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Actions */}
        <TableCell className="text-right">
          <TableRowActions proxy={proxy} />
        </TableCell>
      </>
    );
  }
}

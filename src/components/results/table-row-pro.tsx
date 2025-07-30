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
              <div className="max-w-xs break-all font-mono">{proxy.raw}</div>
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
              <TooltipContent className="max-w-xs">
                <p className="font-semibold text-text-primary">
                  {proxy.error.message}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {proxy.error.suggestion}
                </p>
                {proxy.error.protocolsTried &&
                  proxy.error.protocolsTried.length > 1 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Protocols tried: {proxy.error.protocolsTried.join(", ")}
                    </p>
                  )}
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
                <span className="cursor-help text-blue-400">
                  {Math.round(proxy.proDetails.firstConnectionTime)}ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">First connection time</p>
                <p className="text-xs text-gray-400 mt-1">
                  Initial connection with complete setup
                </p>
                <div className="text-xs text-gray-300 mt-2">
                  <p>📊 Breakdown:</p>
                  <p>
                    • DNS:{" "}
                    {proxy.proDetails.averageMetrics?.dnsLookupTime.toFixed(1)}
                    ms
                  </p>
                  <p>
                    • TCP:{" "}
                    {proxy.proDetails.averageMetrics?.tcpConnectTime.toFixed(1)}
                    ms
                  </p>
                  <p>
                    • Auth:{" "}
                    {(
                      (proxy.proDetails.averageMetrics?.proxyConnectTime || 0) +
                      (proxy.proDetails.averageMetrics?.proxyAuthTime || 0)
                    ).toFixed(1)}
                    ms
                  </p>
                  <p>
                    • TLS:{" "}
                    {proxy.proDetails.averageMetrics?.tlsHandshakeTime.toFixed(
                      1
                    )}
                    ms
                  </p>
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
                <div className="cursor-help text-green-400 flex items-center gap-1">
                  <span>
                    {Math.round(proxy.proDetails.subsequentConnectionTime)}ms
                  </span>
                  {proxy.proDetails.connections?.some(
                    (c) => c.sessionReused
                  ) && <span className="text-xs text-green-500">♻️</span>}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">
                  Average subsequent connection time
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Reuses existing connection
                </p>
                {proxy.proDetails.firstConnectionTime > 0 && (
                  <>
                    <p className="text-xs text-green-400 mt-2">
                      {(
                        (1 -
                          proxy.proDetails.subsequentConnectionTime /
                            proxy.proDetails.firstConnectionTime) *
                        100
                      ).toFixed(1)}
                      % faster than first connection
                    </p>
                    <div className="text-xs text-gray-300 mt-2">
                      <p>⚡ Skips:</p>
                      <p>• DNS lookup (cached)</p>
                      <p>• TCP handshake (reused)</p>
                      <p>• TLS negotiation (resumed)</p>
                      <p>• Proxy auth (already done)</p>
                    </div>
                  </>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* DNS */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics?.dnsLookupTime != null ? (
            <span className="text-purple-400">
              {proxy.proDetails.averageMetrics.dnsLookupTime.toFixed(1)}ms
            </span>
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
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Direct latency to proxy server</p>
                <p className="text-xs text-gray-400 mt-1">
                  Time to establish TCP connection with the proxy
                </p>
                <div className="text-xs text-gray-300 mt-2 space-y-1">
                  <p>⚡ This depends on:</p>
                  <p>• Your physical distance to the proxy server</p>
                  <p>• Network quality between you and the proxy</p>
                  <p>• Proxy server load and response time</p>
                </div>
                <p className="text-xs text-blue-300 mt-2">
                  💡 Lower is better. Under 50ms is excellent.
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* TLS */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics?.tlsHandshakeTime != null ? (
            <span className="text-cyan-400">
              {proxy.proDetails.averageMetrics.tlsHandshakeTime.toFixed(1)}ms
            </span>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Response Time */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.averageMetrics != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-green-400">
                  {Math.max(
                    0,
                    proxy.proDetails.averageMetrics.responseWaitTime +
                      proxy.proDetails.averageMetrics.responseDownloadTime
                  ).toFixed(1)}
                  ms
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Response time breakdown</p>
                <div className="text-xs text-gray-400 mt-1">
                  <p>
                    Wait:{" "}
                    {Math.max(
                      0,
                      proxy.proDetails.averageMetrics.responseWaitTime
                    ).toFixed(1)}
                    ms
                  </p>
                  <p>
                    Download:{" "}
                    {Math.max(
                      0,
                      proxy.proDetails.averageMetrics.responseDownloadTime
                    ).toFixed(1)}
                    ms
                  </p>
                </div>
                <div className="text-xs text-gray-300 mt-2">
                  <p>📥 Two phases:</p>
                  <p>
                    • <b>Wait:</b> Time until first byte from target site
                  </p>
                  <p>
                    • <b>Download:</b> Time to receive all data
                  </p>
                </div>
                <p className="text-xs text-green-300 mt-2">
                  🌍 Depends on target website speed + proxy location
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Number of Connections */}
        <TableCell className="font-mono text-sm">
          {proxy.proDetails?.connections?.length != null ? (
            <span className="text-indigo-400">
              {proxy.proDetails.connections.length}
            </span>
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

// Fix for ResultsTableRowSimple.tsx - Remove the motion.tr wrapper since it's handled in parent
"use client";
import { motion } from "framer-motion";
import {
  ProxyProtocol,
  ProxyTesterOptions,
  type Proxy,
  type ProxyStatus,
} from "@/types";
import { cn, countryCodeToFlag } from "@/lib/utils";
import { TableCell } from "@/components/ui/table";
import { Check, Clipboard, Eye, Globe2, Trash } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import TableRowActions from "./table-row-actions";

export default function ResultsTableRowSimple({
  proxy,
  options,
}: {
  proxy: Proxy;
  options: ProxyTesterOptions;
}) {
  const [isProxyCopied, copyProxy] = useCopyToClipboard();
  const [isIpCopied, copyIp] = useCopyToClipboard();

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

      {options.simpleMode.latencyCheck && (
        <TableCell className="">
          <div className="font-mono">
            {proxy.latency ? `${proxy.latency}ms` : "0ms"}
          </div>
        </TableCell>
      )}

      {options.simpleMode.ipLookup && (
        <TableCell>
          {proxy.simpleData?.ip && proxy.simpleData?.countryCode ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xl">
                {countryCodeToFlag(proxy.simpleData.countryCode)}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-secondary-foreground">
                  {String(proxy.simpleData.country ?? "Unknown")}
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => copyIp(proxy.simpleData!.ip)}
                      className="flex items-center gap-1.5 text-left font-mono text-xs text-text-secondary cursor-pointer hover:text-foreground"
                    >
                      {String(proxy.simpleData?.ip || "")}
                      {isIpCopied ? (
                        <Check className="size-3 text-green-500" />
                      ) : (
                        <Clipboard className="size-3" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isIpCopied ? "Copied!" : "Copy IP Address"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      <TableCell className="text-right">
        <TableRowActions proxy={proxy} />
      </TableCell>
    </>
  );
}

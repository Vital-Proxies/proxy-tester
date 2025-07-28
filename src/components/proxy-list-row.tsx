"use client";
import { motion } from "framer-motion";
import { ProxyProtocol, type Proxy, type ProxyStatus } from "@/types";
import { cn, countryCodeToFlag } from "@/lib/utils";
import { TableCell } from "@/components/ui/table";
import { Check, Clipboard, Eye, Globe2, Trash } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import { useProxyTesterStore } from "@/store/proxy";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import dynamic from "next/dynamic";
import { ProModeColumns } from "./proxy-list-row-promode";

const ProModeMetrics = dynamic(() => import("./pro-mode-metrics"), {
  loading: () => <div className="text-sm text-gray-400">Loading metrics...</div>
});

type ProxyListRowProps = {
  proxy: Proxy;
  latencyCheck: boolean;
  ipLookup: boolean;
  proMode?: boolean;
};

export default function ProxyListRow({
  proxy,
  latencyCheck,
  ipLookup,
  proMode = false,
}: ProxyListRowProps) {
  const { removeTestedProxy } = useProxyTesterStore();
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
  const currentProtocol = protocolConfig[proxy.protocol || "unknown"];

  return (
    <TooltipProvider>
      <motion.tr
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b"
      >
        <TableCell className="font-mono text-sm max-w-[200px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-full w-full cursor-pointer items-center justify-start">
                <span className="truncate block">{String(proxy.formatted || proxy.raw || '')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs break-all font-mono">{String(proxy.raw || '')}</div>
            </TooltipContent>
          </Tooltip>
        </TableCell>

        <TableCell className="text-sm">
          <div
            className={cn(
              "mx-auto w-fit rounded-md px-2 py-0.5 font-semibold tracking-wider",
              currentProtocol.className
            )}
          >
            {currentProtocol.label}
          </div>
        </TableCell>

        <TableCell>
          {proxy.status === "fail" && proxy.errorDetails ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-center gap-2 text-center px-2.5 rounded-lg py-1 text-xs font-semibold border cursor-help",
                    currentStatus.className
                  )}
                >
                  <span className="capitalize">{currentStatus.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Connection Failed</p>
                <p className="text-xs text-gray-400 mt-1">{proxy.errorDetails.message}</p>
                {proxy.errorDetails.protocolsTried && proxy.errorDetails.protocolsTried.length > 1 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Protocols tried: {proxy.errorDetails.protocolsTried.join(", ")}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={cn(
                "flex items-center justify-center gap-2 text-center px-2.5 rounded-lg py-1 text-xs font-semibold border",
                currentStatus.className
              )}
            >
              <span className="capitalize">{currentStatus.label}</span>
            </div>
          )}
        </TableCell>


        {proMode && <ProModeColumns proxy={proxy} />}

        {ipLookup && (
          <TableCell>
            {proxy.ip && proxy.countryCode ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xl">
                  {countryCodeToFlag(proxy.countryCode)}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-secondary-foreground">
                    {String(proxy.country ?? "Unknown")}
                  </span>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => copyIp(proxy.ip!)}
                        className="flex items-center gap-1.5 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        {String(proxy.ip || '')}
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
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Eye className="size-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Details</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyProxy(proxy.raw)}
                >
                  <Clipboard className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isProxyCopied ? <p>Copied!</p> : <>Copy Proxy</>}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => removeTestedProxy(proxy)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialogContent className="min-w-[600px] bg-white/5 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-1.5">
                  <span className="text-2xl">
                    {proxy.countryCode ? (
                      countryCodeToFlag(proxy.countryCode ?? "")
                    ) : (
                      <Globe2 className="size-5" />
                    )}
                  </span>
                  Proxy Details
                </AlertDialogTitle>
                <AlertDialogDescription>
                  A detailed breakdown of the proxy and its test results.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                {/* Label */}
                <div className="font-medium text-muted-foreground">Status</div>
                {/* Value */}
                <div className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center justify-center gap-2 text-center px-2.5 rounded-lg py-1 text-xs font-semibold border",
                      currentStatus.className
                    )}
                  >
                    <span className="capitalize">{currentStatus.label}</span>
                  </div>
                </div>

                <div className="font-medium text-muted-foreground">Latency</div>
                <div className="font-mono">
                  {proxy.latency != null ? `${proxy.latency}ms` : "—"}
                </div>

                <div className="font-medium text-muted-foreground">Country</div>
                <div>{String(proxy.country ?? "—")}</div>

                <div className="font-medium text-muted-foreground">City</div>
                <div>{String(proxy.city ?? "—")}</div>

                <div className="font-medium text-muted-foreground">ISP</div>
                <div>{proxy.isp ?? "—"}</div>

                <div className="font-medium text-muted-foreground">
                  IP Address
                </div>
                <div className="font-mono">{proxy.ip ?? "—"}</div>

                {proxy.proModeResult && (
                  <>
                    <div className="col-span-2 mt-2 pt-3 font-medium text-muted-foreground border-t">
                      Pro Mode Metrics
                    </div>
                    <div className="col-span-2">
                      <ProModeMetrics result={proxy.proModeResult} />
                    </div>
                  </>
                )}

                <div className="col-span-2 mt-2 pt-3 font-medium text-muted-foreground border-t">
                  Raw String
                </div>
                <div className="relative col-span-2 rounded-md bg-white/5  p-3 font-mono text-xs text-text-primary">
                  <pre className="whitespace-pre-wrap break-all pr-10">
                    {proxy.raw}
                  </pre>
                </div>
              </div>

              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => copyProxy(proxy.raw)}>
                  {isProxyCopied ? (
                    <>
                      <Check className="size-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard className="size-4" /> Copy Proxy
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      </motion.tr>
    </TooltipProvider>
  );
}

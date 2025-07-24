"use client";
import { motion } from "framer-motion";
import { type Proxy, type ProxyStatus } from "@/types";
import { cn, countryCodeToFlag } from "@/lib/utils";
import { TableCell } from "@/components/ui/table";
import { Check, Clipboard, Eye, Loader2, Trash } from "lucide-react";
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

type ProxyListRowProps = {
  proxy: Proxy;
  latencyCheck: boolean;
  ipLookup: boolean;
};

export default function ProxyListRow({
  proxy,
  latencyCheck,
  ipLookup,
}: ProxyListRowProps) {
  const { removeTestedProxy } = useProxyTesterStore();
  const [isProxyCopied, copyProxy] = useCopyToClipboard();
  const [isIpCopied, copyIp] = useCopyToClipboard();

  const statusConfig: Record<
    ProxyStatus,
    { className: string; label: string }
  > = {
    ok: { className: "bg-green-600/10 text-green-400", label: "OK" },
    fail: { className: "bg-red-600/10 text-red-500", label: "Fail" },
    testing: { className: "bg-blue-600/10 text-blue-400", label: "Testing" },
    pending: {
      className: "bg-muted/20 text-muted-foreground",
      label: "Pending",
    },
  };

  const currentStatus = statusConfig[proxy.status];

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
        <TableCell className="w-[240px] max-w-[240px] truncate font-mono text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-full w-full cursor-pointer items-center justify-start">
                <span className="truncate">{proxy.raw}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs break-all font-mono">{proxy.raw}</div>
            </TooltipContent>
          </Tooltip>
        </TableCell>

        <TableCell>
          <div
            className={cn(
              "flex items-center justify-center gap-2 rounded-fulltext-center px-2.5 py-1 text-xs font-semibold",
              currentStatus.className
            )}
          >
            {proxy.status === "testing" && (
              <Loader2 className="size-3 animate-spin" />
            )}
            <span className="text-center">{currentStatus.label}</span>
          </div>
        </TableCell>

        {latencyCheck && (
          <TableCell className="font-mono text-sm">
            {proxy.latency != null ? `${proxy.latency}ms` : "—"}
          </TableCell>
        )}

        {ipLookup && (
          <TableCell>
            {proxy.ip && proxy.countryCode ? (
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {countryCodeToFlag(proxy.countryCode)}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-secondary-foreground">
                    {proxy.country ?? "Unknown"}
                  </span>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => copyIp(proxy.ip!)}
                        className="flex items-center gap-1.5 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        {proxy.ip}
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
              <span className="text-sm text-muted-foreground">
                {proxy.status === "testing" ? "Resolving..." : "—"}
              </span>
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
                <AlertDialogTitle className="flex items-center gap-3">
                  <span className="text-2xl">
                    {countryCodeToFlag(proxy.countryCode ?? "")}
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
                      "flex items-center justify-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold",
                      currentStatus.className
                    )}
                  >
                    {proxy.status === "testing" && (
                      <Loader2 className="size-3 animate-spin" />
                    )}
                    <span>{currentStatus.label}</span>
                  </div>
                </div>

                <div className="font-medium text-muted-foreground">Latency</div>
                <div className="font-mono">
                  {proxy.latency != null ? `${proxy.latency}ms` : "—"}
                </div>

                <div className="font-medium text-muted-foreground">Country</div>
                <div>{proxy.country ?? "—"}</div>

                <div className="font-medium text-muted-foreground">City</div>
                <div>{proxy.city ?? "—"}</div>

                <div className="font-medium text-muted-foreground">ISP</div>
                <div>{proxy.isp ?? "—"}</div>

                <div className="font-medium text-muted-foreground">
                  IP Address
                </div>
                <div className="font-mono">{proxy.ip ?? "—"}</div>

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

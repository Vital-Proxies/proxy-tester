import { Proxy, ProxyProtocol, ProxyStatus } from "@/types";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { cn, countryCodeToFlag } from "@/lib/utils";
import { Check, Clipboard, Globe2 } from "lucide-react";
import ProModeMetrics from "./dialog-detail-pro";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { useProxyTesterStore } from "@/store/proxy";

export default function DetailsDialog({
  proxy,
  children,
}: {
  proxy: Proxy;
  children: React.ReactNode;
}) {
  const { options } = useProxyTesterStore();

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
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="min-w-[600px] bg-white/5 backdrop-blur-xl">
        <AlertDialogHeader className="pb-4 border-b">
          <AlertDialogTitle className="flex items-center gap-1.5">
            <span className="text-2xl">
              {proxy.simpleData?.countryCode ? (
                countryCodeToFlag(proxy.simpleData.countryCode ?? "")
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
        <div className="grid grid-cols-[auto_1fr] px-2 max-h-[60dvh] overflow-auto items-center gap-x-4 gap-y-3 text-sm relative">
          {proxy.simpleData && (
            <>
              <div className="font-medium text-muted-foreground">Status</div>

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

              <div className="font-medium text-text-muted">Latency</div>
              <div className="font-mono">
                {proxy.latency != null ? `${proxy.latency}ms` : "—"}
              </div>

              <div className="font-medium text-text-muted">Country</div>
              <div>{String(proxy.simpleData?.country ?? "—")}</div>

              <div className="font-medium text-text-muted">City</div>
              <div>{String(proxy.simpleData?.city ?? "—")}</div>

              <div className="font-medium text-text-muted">ISP</div>
              <div>{proxy.simpleData?.isp ?? "—"}</div>

              <div className="font-medium text-text-muted">IP Address</div>
              <div className="font-mono">{proxy.simpleData?.ip ?? "—"}</div>
            </>
          )}

          {proxy.proDetails && (
            <>
              <div className="col-span-2">
                <ProModeMetrics result={proxy} />
              </div>
            </>
          )}

          <p className="col-span-2 mt-2 pt-3 font-medium text-text-secondary border-t">
            Raw String
          </p>
          <div className="relative col-span-2 rounded-md bg-white/5 p-3 font-mono text-xs text-text-primary">
            <pre className="whitespace-pre-wrap break-all pr-10">
              {proxy.raw}
            </pre>
          </div>
        </div>

        <AlertDialogFooter className="pt-4 border-t">
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
  );
}

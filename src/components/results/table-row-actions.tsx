import { Proxy, ProxyProtocol, ProxyStatus, ProxyTesterOptions } from "@/types";
import { Check, Clipboard, Eye, Globe2, Trash } from "lucide-react";
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
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useProxyTesterStore } from "@/store/proxy";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import DetailsDialog from "./dialog-details";

export default function TableRowActions({ proxy }: { proxy: Proxy }) {
  const [isProxyCopied, copyProxy] = useCopyToClipboard();
  const [isIpCopied, copyIp] = useCopyToClipboard();

  const { removeTestedProxy, options } = useProxyTesterStore();

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
    <div className="flex items-center justify-end gap-1">
      <DetailsDialog proxy={proxy}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="size-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Details</p>
          </TooltipContent>
        </Tooltip>
      </DetailsDialog>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
            className="h-8 w-8"
          >
            <Trash className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

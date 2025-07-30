import { useProxyTesterStore } from "@/store/proxy";
import { TableHead, TableHeader, TableRow } from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { HelpCircle } from "lucide-react";

export default function ResultsTableHead() {
  const { options } = useProxyTesterStore();

  return (
    <TableRow>
      <TableHead className="text-left text-sm px-2 min-w-[200px]">
        Proxy
      </TableHead>
      <TableHead className="text-left text-sm px-2 w-[120px] ">Type</TableHead>
      <TableHead className="text-left text-sm px-2 w-[120px] ">
        Status
      </TableHead>

      {options.activeMode === "pro" && (
        <>
          <TableHead className="text-left text-sm px-2 min-w-[90px]">
            <HeaderWithTooltip
              label="1st Conn"
              tip="Initial connection with full handshake. Includes: DNS + TCP + Auth + TLS + Request."
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[90px]">
            <HeaderWithTooltip
              label="Next Conns Avg"
              tip="Subsequent requests reusing the existing session. Much faster!"
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[70px]">
            <HeaderWithTooltip
              label="DNS"
              tip="Time to resolve proxy hostname to IP address."
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[90px]">
            <HeaderWithTooltip
              label="Proxy Latency"
              tip="Latency between your machine and the proxy server."
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[70px]">
            <HeaderWithTooltip
              label="TLS"
              tip="Time to establish secure HTTPS connection (TLS handshake)."
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[100px]">
            <HeaderWithTooltip
              label="Response"
              tip="Total time for proxy to return a response from target site."
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[80px]">
            <HeaderWithTooltip
              label="Conns"
              tip="Number of requests tested through this proxy."
            />
          </TableHead>
        </>
      )}

      {options.activeMode === "simple" && options.simpleMode.latencyCheck && (
        <TableHead className="text-left text-sm px-2 w-[120px] ">
          Latency
        </TableHead>
      )}

      {options.activeMode === "simple" && options.simpleMode.ipLookup && (
        <TableHead className="text-left text-sm px-2 min-w-[120px] ">
          IP/Location
        </TableHead>
      )}

      <TableHead className="text-right text-sm px-2 w-[120px] ">
        Actions
      </TableHead>
    </TableRow>
  );
}

function HeaderWithTooltip({ label, tip }: { label: string; tip: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <span>{label}</span>
            <HelpCircle size={12} className="text-gray-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

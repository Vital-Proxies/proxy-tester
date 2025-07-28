import { TableCell } from "@/components/ui/table";
import { Proxy } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

interface ProModeColumnsProps {
  proxy: Proxy;
}

export function ProModeColumns({ proxy }: ProModeColumnsProps) {
  return (
    <>
      {/* First Connection */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.firstConnectionTime != null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-blue-400">
                {Math.round(proxy.proModeResult.firstConnectionTime)}ms
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">First connection time</p>
              <p className="text-xs text-gray-400 mt-1">Initial connection with complete setup</p>
              <div className="text-xs text-gray-300 mt-2">
                <p>📊 Breakdown:</p>
                <p>• DNS: {proxy.proModeResult.averageMetrics?.dnsLookupTime.toFixed(1)}ms</p>
                <p>• TCP: {proxy.proModeResult.averageMetrics?.tcpConnectTime.toFixed(1)}ms</p>
                <p>• Auth: {((proxy.proModeResult.averageMetrics?.proxyConnectTime || 0) + (proxy.proModeResult.averageMetrics?.proxyAuthTime || 0)).toFixed(1)}ms</p>
                <p>• TLS: {proxy.proModeResult.averageMetrics?.tlsHandshakeTime.toFixed(1)}ms</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : "—"}
      </TableCell>
      
      {/* Subsequent Connections */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.subsequentConnectionTime != null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help text-green-400 flex items-center gap-1">
                <span>{Math.round(proxy.proModeResult.subsequentConnectionTime)}ms</span>
                {proxy.proModeResult.connections?.some(c => c.sessionReused) && (
                  <span className="text-xs text-green-500">♻️</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">Average subsequent connection time</p>
              <p className="text-xs text-gray-400 mt-1">Reuses existing connection</p>
              {proxy.proModeResult.firstConnectionTime > 0 && (
                <>
                  <p className="text-xs text-green-400 mt-2">
                    {((1 - proxy.proModeResult.subsequentConnectionTime / proxy.proModeResult.firstConnectionTime) * 100).toFixed(1)}% faster than first connection
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
        ) : "—"}
      </TableCell>
      
      {/* DNS */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.averageMetrics?.dnsLookupTime != null ? (
          <span className="text-purple-400">
            {proxy.proModeResult.averageMetrics.dnsLookupTime.toFixed(1)}ms
          </span>
        ) : "—"}
      </TableCell>
      
      {/* Proxy Latency */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.averageMetrics?.tcpConnectTime != null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-orange-400 font-semibold">
                {proxy.proModeResult.averageMetrics.tcpConnectTime.toFixed(1)}ms
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">Direct latency to proxy server</p>
              <p className="text-xs text-gray-400 mt-1">Time to establish TCP connection with the proxy</p>
              <div className="text-xs text-gray-300 mt-2 space-y-1">
                <p>⚡ This depends on:</p>
                <p>• Your physical distance to the proxy server</p>
                <p>• Network quality between you and the proxy</p>
                <p>• Proxy server load and response time</p>
              </div>
              <p className="text-xs text-blue-300 mt-2">💡 Lower is better. Under 50ms is excellent.</p>
            </TooltipContent>
          </Tooltip>
        ) : "—"}
      </TableCell>
      
      {/* TLS */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.averageMetrics?.tlsHandshakeTime != null ? (
          <span className="text-cyan-400">
            {proxy.proModeResult.averageMetrics.tlsHandshakeTime.toFixed(1)}ms
          </span>
        ) : "—"}
      </TableCell>
      
      {/* Response Time */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.averageMetrics != null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-green-400">
                {Math.max(0, proxy.proModeResult.averageMetrics.responseWaitTime + 
                  proxy.proModeResult.averageMetrics.responseDownloadTime).toFixed(1)}ms
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">Response time breakdown</p>
              <div className="text-xs text-gray-400 mt-1">
                <p>Wait: {Math.max(0, proxy.proModeResult.averageMetrics.responseWaitTime).toFixed(1)}ms</p>
                <p>Download: {Math.max(0, proxy.proModeResult.averageMetrics.responseDownloadTime).toFixed(1)}ms</p>
              </div>
              <div className="text-xs text-gray-300 mt-2">
                <p>📥 Two phases:</p>
                <p>• <b>Wait:</b> Time until first byte from target site</p>
                <p>• <b>Download:</b> Time to receive all data</p>
              </div>
              <p className="text-xs text-green-300 mt-2">🌍 Depends on target website speed + proxy location</p>
            </TooltipContent>
          </Tooltip>
        ) : "—"}
      </TableCell>
      
      {/* Number of Connections */}
      <TableCell className="font-mono text-sm">
        {proxy.proModeResult?.connections?.length != null ? (
          <span className="text-indigo-400">
            {proxy.proModeResult.connections.length}
          </span>
        ) : "—"}
      </TableCell>
    </>
  );
}
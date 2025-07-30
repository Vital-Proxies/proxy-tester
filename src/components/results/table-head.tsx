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
              tip={{
                title: "First Connection Setup Time",
                description:
                  "How long it takes to connect to this proxy and make your first request.",
                details: [
                  "Find the proxy's IP address (DNS lookup)",
                  "Open a connection to the proxy server",
                  "Log in with username/password",
                  "Set up encryption if needed",
                  "Send your first request and get response",
                ],
                note: "This is a one-time setup cost. Think of it like opening an app for the first time - it takes longer than using it afterwards.",
              }}
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[90px]">
            <HeaderWithTooltip
              label="Next Conns Avg"
              tip={{
                title: "Subsequent Connections Average",
                description:
                  "Average response time for connections that reuse the established session.",
                details: [
                  "Bypasses DNS lookup (cached)",
                  "Reuses existing TCP socket",
                  "Skips proxy authentication",
                  "No TLS handshake overhead",
                  "Only HTTP request/response time",
                ],
                note: "Much faster than first connection. Shows sustained performance for applications that make multiple requests through the same proxy.",
              }}
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[70px]">
            <HeaderWithTooltip
              label="DNS"
              tip={{
                title: "DNS Resolution Time",
                description:
                  "Time to resolve the proxy hostname to an IP address.",
                details: [
                  "Query to DNS servers for A/AAAA records",
                  "Network latency to DNS servers",
                  "DNS server processing time",
                  "Response parsing and caching",
                ],
                note: "High DNS times may indicate slow DNS servers or network issues. Subsequent requests use cached results.",
              }}
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[90px]">
            <HeaderWithTooltip
              label="Proxy Latency"
              tip={{
                title: "Network Latency to Proxy",
                description:
                  "Round-trip time between your machine and the proxy server.",
                details: [
                  "TCP connection establishment time",
                  "Network routing and propagation delay",
                  "Proxy server responsiveness",
                  "Geographic distance impact",
                ],
                note: "Lower latency = faster browsing. Proxies closer to your location typically have better latency.",
              }}
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[70px]">
            <HeaderWithTooltip
              label="TLS"
              tip={{
                title: "TLS/SSL Handshake Time",
                description:
                  "Time to establish a secure HTTPS connection through the proxy.",
                details: [
                  "TLS version negotiation",
                  "Certificate exchange and validation",
                  "Cryptographic key establishment",
                  "Cipher suite selection",
                ],
                note: "Only applies to HTTPS proxies or HTTPS requests through HTTP proxies. Modern TLS 1.3 is typically faster than older versions.",
              }}
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[100px]">
            <HeaderWithTooltip
              label="Response"
              tip={{
                title: "Ongoing Request Speed",
                description:
                  "How fast the proxy handles each request after the initial setup is done.",
                details: [
                  "Proxy receives your request",
                  "Proxy fetches data from the website",
                  "Website sends back the data",
                  "Proxy delivers it back to you",
                ],
                note: "This is the speed you'll experience for most requests. Much faster than first connection since setup is already done.",
              }}
            />
          </TableHead>

          <TableHead className="text-left text-sm px-2 min-w-[80px]">
            <HeaderWithTooltip
              label="Conns"
              tip={{
                title: "Connections Tested",
                description:
                  "Number of test connections made to this proxy for statistical analysis.",
                details: [
                  "First connection measures cold start",
                  "Additional connections test consistency",
                  "Higher counts provide better accuracy",
                  "Helps identify intermittent issues",
                ],
                note: "Multiple connections help distinguish between temporary network glitches and persistent proxy problems.",
              }}
            />
          </TableHead>
        </>
      )}

      {options.activeMode === "simple" && options.simpleMode.latencyCheck && (
        <TableHead className="text-left text-sm px-2 w-[120px] ">
          <HeaderWithTooltip
            label="Latency"
            tip={{
              title: "Simple Latency Check",
              description:
                "Basic round-trip response time measurement for quick proxy validation.",
              details: [
                "Single connection test",
                "Includes all connection overhead",
                "DNS + TCP + Proxy + Request time",
                "Good for general proxy health",
              ],
              note: "Fast way to check if proxies are working and responsive. For detailed timing breakdown, use Pro Mode.",
            }}
          />
        </TableHead>
      )}

      {options.activeMode === "simple" && options.simpleMode.ipLookup && (
        <TableHead className="text-left text-sm px-2 min-w-[120px] ">
          <HeaderWithTooltip
            label="IP/Location"
            tip={{
              title: "Exit IP & Geolocation",
              description:
                "The public IP address and location that websites see when using this proxy.",
              details: [
                "Exit IP address detection",
                "Country and region identification",
                "ISP and organization info",
                "Anonymity verification",
              ],
              note: "Critical for geo-restricted content, privacy validation, and ensuring your real IP is properly hidden.",
            }}
          />
        </TableHead>
      )}

      <TableHead className="text-right text-sm px-2 w-[120px] ">
        Actions
      </TableHead>
    </TableRow>
  );
}

interface TooltipData {
  title: string;
  description: string;
  details: string[];
  note: string;
}

function HeaderWithTooltip({
  label,
  tip,
}: {
  label: string;
  tip: TooltipData;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <span>{label}</span>
            <HelpCircle size={12} className="text-gray-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium">{tip.title}</p>
            <p className="text-sm">{tip.description}</p>
            <div className="text-xs text-white/70 space-y-1">
              {tip.details.map((detail, index) => (
                <p key={index}>• {detail}</p>
              ))}
            </div>
            <p className="text-xs text-white/80 italic border-t border-white/20 pt-2">
              {tip.note}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

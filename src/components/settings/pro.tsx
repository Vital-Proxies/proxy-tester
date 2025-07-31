import { useProxyTesterStore } from "@/store/proxy";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import { Dispatch, SetStateAction, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Network, Layers, Clock, RotateCcw } from "lucide-react";

export default function ProModeSettings({
  setHeight,
}: {
  setHeight: Dispatch<SetStateAction<number>>;
}) {
  const { options, setOptions, isLoading } = useProxyTesterStore();

  const ref = useRef<HTMLDivElement>(null);

  // useLayoutEffect runs after the DOM is updated but before the browser paints
  // This is the perfect time to measure!
  useLayoutEffect(() => {
    if (ref.current) {
      setHeight(ref.current.offsetHeight);
    }
  }, [setHeight]);

  return (
    <div ref={ref} className="space-y-5">
      <div className="space-y-4">
        {/* Connections per Proxy */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5">
                <Network className="h-4 w-4 text-accent" />
                <Label
                  htmlFor="connections-per-proxy"
                  className="text-sm cursor-help"
                >
                  Connections per Proxy
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Multiple Connection Testing</p>
                <p>
                  Tests multiple connections to each proxy to measure
                  consistency and performance variations.
                </p>
                <div className="text-xs text-white/70 space-y-1">
                  <p>• 1 connection = Basic validation only</p>
                  <p>• 2-3 connections = Good consistency testing</p>
                  <p>• 4+ connections = Detailed performance analysis</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <Input
            className={cn(
              "w-20 h-8 text-center bg-white/5 border-white/20",
              "focus:border-white/40 focus:bg-white/10",
              "transition-all duration-200",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            id="connections-per-proxy"
            type="number"
            min="1"
            max="10"
            value={options.proMode.connectionsPerProxy || 3}
            onChange={(e) =>
              setOptions({
                proMode: {
                  ...options.proMode,
                  connectionsPerProxy: parseInt(e.target.value) || 3,
                },
              })
            }
            disabled={isLoading}
          />
        </div>

        {/* Connection Pooling */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-accent" />
                <Label
                  htmlFor="connection-pooling"
                  className="text-sm cursor-help"
                >
                  Connection Pooling
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Socket Reuse Strategy</p>
                <p>
                  Controls whether connections are reused between multiple
                  requests to the same proxy.
                </p>
                <div className="text-xs text-white/70 space-y-1">
                  <p>
                    <strong>Enabled:</strong> First connection does full
                    handshake (DNS, TCP, proxy auth), subsequent connections
                    reuse the socket for faster testing.
                  </p>
                  <p>
                    <strong>Disabled:</strong> Every connection performs full
                    handshake from scratch, testing &quot;cold start&quot;
                    performance consistently.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <Switch
            id="connection-pooling"
            checked={options.proMode.connectionPooling !== false}
            onCheckedChange={(checked) =>
              setOptions({
                proMode: {
                  ...options.proMode,
                  connectionPooling: checked,
                },
              })
            }
            disabled={isLoading}
          />
        </div>

        {/* Custom Timeout */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-accent" />
                <Label htmlFor="custom-timeout" className="text-sm cursor-help">
                  Timeout (ms)
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Connection Timeout</p>
                <p>
                  Maximum time to wait for each proxy connection before marking
                  it as failed.
                </p>
                <div className="text-xs text-white/70 space-y-1">
                  <p>• 5000ms (5s) = Fast timeout for quick testing</p>
                  <p>• 10000ms (10s) = Balanced timeout (recommended)</p>
                  <p>• 15000ms+ = Patient timeout for slow proxies</p>
                  <p>
                    Higher values give slow proxies more time but make testing
                    slower overall.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <Input
            id="custom-timeout"
            type="number"
            min="1000"
            max="30000"
            step="1000"
            value={options.proMode.customTimeout || 10000}
            onChange={(e) =>
              setOptions({
                proMode: {
                  ...options.proMode,
                  customTimeout: parseInt(e.target.value) || 10000,
                },
              })
            }
            className={cn(
              "w-24 h-8 text-center bg-white/5 border-white/20",
              "focus:border-white/40 focus:bg-white/10",
              "transition-all duration-200",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            disabled={isLoading}
          />
        </div>

        {/* Retry Count */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5">
                <RotateCcw className="h-4 w-4 text-accent" />
                <Label htmlFor="retry-count" className="text-sm cursor-help">
                  Retry Failed Proxies
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Failure Retry Logic</p>
                <p>
                  How many times to retry a proxy that fails on the first
                  attempt before marking it as definitively failed.
                </p>
                <div className="text-xs text-white/70 space-y-1">
                  <p>• 0 retries = No second chances, fast testing</p>
                  <p>• 1 retry = One second chance (recommended)</p>
                  <p>• 2-3 retries = Very patient, slower testing</p>
                  <p>
                    Helps distinguish between temporary network issues and truly
                    broken proxies.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <Input
            id="retry-count"
            type="number"
            min="0"
            max="3"
            value={options.proMode.retryCount || 1}
            onChange={(e) =>
              setOptions({
                proMode: {
                  ...options.proMode,
                  retryCount: parseInt(e.target.value) || 1,
                },
              })
            }
            className={cn(
              "w-20 h-8 text-center bg-white/5 border-white/20",
              "focus:border-white/40 focus:bg-white/10",
              "transition-all duration-200",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

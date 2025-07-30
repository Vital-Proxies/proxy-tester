import { useProxyTesterStore } from "@/store/proxy";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import { Dispatch, SetStateAction, useLayoutEffect, useRef } from "react";

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
    <div ref={ref} className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="connections-per-proxy" className="text-sm">
            Connections per Proxy
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="connections-per-proxy"
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
        </div>

        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label
                htmlFor="connection-pooling"
                className="text-sm cursor-help"
              >
                Connection Pooling
              </Label>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Reuse connections to measure session performance</p>
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

        <div className="flex items-center justify-between">
          <Label htmlFor="custom-timeout" className="text-sm">
            Timeout (ms)
          </Label>
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
            className="w-24 text-center"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label htmlFor="retry-count" className="text-sm cursor-help">
                Retry Failed Proxies
              </Label>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Number of retry attempts for failed connections</p>
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
            className="w-20 text-center"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

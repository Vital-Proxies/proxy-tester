import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { Activity, Globe } from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useProxyTesterStore } from "@/store/proxy";
import { useRef, useLayoutEffect, Dispatch, SetStateAction } from "react";

export default function SimpleModeSettings({
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
      {/* Latency Check */}
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-accent" />
              <Label htmlFor="latency-check" className="text-sm cursor-help">
                Latency Check
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Response Time Measurement</p>
              <p>
                Measures how fast each proxy responds to requests, giving you
                the total round-trip time in milliseconds.
              </p>
              <div className="text-xs text-white/70 space-y-1">
                <p>• &lt;100ms = Excellent (local/premium proxies)</p>
                <p>• 100-500ms = Good (most reliable proxies)</p>
                <p>• 500ms-1s = Acceptable (distant/budget proxies)</p>
                <p>• &gt;1s = Slow (may impact browsing experience)</p>
                <p>
                  Essential for applications requiring fast response times like
                  web scraping or real-time data access.
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        <Switch
          onCheckedChange={(checked) =>
            setOptions({
              simpleMode: {
                ...options.simpleMode,
                latencyCheck: checked,
              },
            })
          }
          checked={options.simpleMode.latencyCheck}
          disabled={isLoading}
        />
      </div>

      {/* IP Lookup */}
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-accent" />
              <Label htmlFor="ip-lookup" className="text-sm cursor-help">
                IP Lookup
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Exit IP & Geolocation Detection</p>
              <p>
                Determines the actual public IP address and geographic location
                that websites will see when you use each proxy.
              </p>
              <div className="text-xs text-white/70 space-y-1">
                <p>
                  • <strong>Exit IP:</strong> The IP address websites see
                </p>
                <p>
                  • <strong>Location:</strong> Country, region, and city
                </p>
                <p>
                  • <strong>ISP Info:</strong> Internet service provider details
                </p>

                <p>
                  Critical for geo-restricted content access, privacy
                  validation, and compliance with location-based services.
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        <Switch
          onCheckedChange={(checked) =>
            setOptions({
              simpleMode: {
                ...options.simpleMode,
                ipLookup: checked,
              },
            })
          }
          checked={options.simpleMode.ipLookup}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

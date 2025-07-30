import { TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { Activity, Globe, Search } from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useProxyTesterStore } from "@/store/proxy";
import { Input } from "../ui/input";
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
    <div ref={ref} className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help items-center gap-2">
              <Activity className="text-accent" size={16} />
              <Label htmlFor="latency-check" className="text-sm">
                Latency Check
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Measure how fast each proxy responds (in ms).</p>
          </TooltipContent>
        </Tooltip>
        <Switch
          id="latency-check"
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

      <div className="flex flex-row items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help items-center gap-2">
              <Search className="text-accent" size={16} />
              <Label htmlFor="ip-lookup" className="text-sm">
                IP Lookup
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Resolve the public IP address and location of each proxy.</p>
          </TooltipContent>
        </Tooltip>
        <Switch
          id="ip-lookup"
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

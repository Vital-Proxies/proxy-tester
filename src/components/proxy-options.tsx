"use client";

import { useProxyTesterStore } from "@/store/proxy";
import { Activity, Globe, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function ProxyOptions() {
  const { options, setOptions, isLoading } = useProxyTesterStore();

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help items-center gap-2">
                <Activity className="text-accent" size={16} />
                <p className="text-sm text-secondary-foreground">
                  Latency Check
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Measure how fast each proxy responds (in ms).</p>
            </TooltipContent>
          </Tooltip>
          <Switch
            onCheckedChange={(checked) => setOptions({ latencyCheck: checked })}
            checked={options.latencyCheck}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-row items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help items-center gap-2">
                <Search className="text-accent" size={16} />
                <p className="text-sm text-secondary-foreground">IP Lookup</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Resolve the public IP address of each proxy.</p>
            </TooltipContent>
          </Tooltip>
          <Switch
            onCheckedChange={(checked) => setOptions({ ipLookup: checked })}
            checked={options.ipLookup}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col items-start gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help items-center gap-2">
                <Globe className="text-accent" size={16} />
                <p className="text-sm text-secondary-foreground">Target URL</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>The endpoint the proxies will attempt to connect to.</p>
            </TooltipContent>
          </Tooltip>
          <Input
            className="border border-white/10"
            placeholder="https://www.google.com"
            value={options.targetUrl}
            onChange={(e) => setOptions({ targetUrl: e.target.value })}
            disabled={isLoading}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

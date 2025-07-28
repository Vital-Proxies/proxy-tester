"use client";

import { useState } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { Activity, Globe, Search, Zap, Settings2, Info } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "@/lib/utils";

export default function ProxyConfiguration() {
  const { options, setOptions, isLoading } = useProxyTesterStore();
  const [activeTab, setActiveTab] = useState<"basic" | "promode">("basic");

  const toggleProMode = () => {
    setOptions({ 
      proMode: !options.proMode,
      // Set pro mode defaults when enabling
      connectionsPerProxy: !options.proMode ? 3 : 1,
      connectionPooling: !options.proMode ? true : false,
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* Pro Mode Toggle Button */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-300/20">
          <div className="flex items-center gap-3">
            <Zap className={cn(
              "size-5 transition-colors",
              options.proMode ? "text-purple-400" : "text-gray-400"
            )} />
            <div>
              <h4 className="font-medium">Pro Mode</h4>
              <p className="text-xs text-muted-foreground">Advanced testing with detailed metrics</p>
            </div>
          </div>
          <Button
            variant={options.proMode ? "default" : "outline"}
            size="sm"
            onClick={toggleProMode}
            className={cn(
              "transition-all",
              options.proMode && "bg-purple-600 hover:bg-purple-700"
            )}
          >
            {options.proMode ? "Enabled" : "Enable"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("basic")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === "basic"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Basic Settings
          </button>
          {options.proMode && (
            <button
              onClick={() => setActiveTab("promode")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                activeTab === "promode"
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              Pro Mode Settings
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === "basic" && (
            <>
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
                      <Label htmlFor="ip-lookup" className="text-sm">IP Lookup</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Resolve the public IP address and location of each proxy.</p>
                  </TooltipContent>
                </Tooltip>
                <Switch
                  id="ip-lookup"
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
                      <Label htmlFor="target-url" className="text-sm">Target URL</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>The endpoint the proxies will attempt to connect to.</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="target-url"
                  className="border border-white/10"
                  placeholder="https://www.google.com"
                  value={options.targetUrl}
                  onChange={(e) => setOptions({ targetUrl: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {activeTab === "promode" && options.proMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Info size={14} />
                <span>Configure advanced testing parameters</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="connections-per-proxy" className="text-sm">
                    Connections per Proxy
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="connections-per-proxy"
                      type="number"
                      min="1"
                      max="10"
                      value={options.connectionsPerProxy || 3}
                      onChange={(e) => setOptions({ connectionsPerProxy: parseInt(e.target.value) || 3 })}
                      className="w-20 text-center"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="connection-pooling" className="text-sm cursor-help">
                        Connection Pooling
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Reuse connections to measure session performance</p>
                    </TooltipContent>
                  </Tooltip>
                  <Switch
                    id="connection-pooling"
                    checked={options.connectionPooling !== false}
                    onCheckedChange={(checked) => setOptions({ connectionPooling: checked })}
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
                    value={options.customTimeout || 10000}
                    onChange={(e) => setOptions({ customTimeout: parseInt(e.target.value) || 10000 })}
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
                    value={options.retryCount || 1}
                    onChange={(e) => setOptions({ retryCount: parseInt(e.target.value) || 1 })}
                    className="w-20 text-center"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-300/20">
                <p className="text-xs text-purple-300">
                  Pro Mode provides detailed timing metrics for each connection phase,
                  helping you understand exactly where latency occurs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
"use client";

import React from "react";
import { ProModeTestResult, DetailedLatencyMetrics } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  Network, 
  Shield, 
  Server, 
  Wifi, 
  Download,
  Upload,
  Layers,
  Activity
} from "lucide-react";

interface ProModeMetricsProps {
  result: ProModeTestResult;
  compact?: boolean;
}

export default function ProModeMetrics({ result, compact = false }: ProModeMetricsProps) {
  const { averageMetrics, connections } = result;

  const metricItems = [
    {
      label: "DNS Lookup",
      value: averageMetrics.dnsLookupTime,
      icon: Network,
      color: "blue",
      description: "Time to resolve domain name to IP address"
    },
    {
      label: "TCP Connect",
      value: averageMetrics.tcpConnectTime,
      icon: Wifi,
      color: "green",
      description: "Time to establish TCP connection"
    },
    {
      label: "TLS Handshake",
      value: averageMetrics.tlsHandshakeTime,
      icon: Shield,
      color: "purple",
      description: "Time to negotiate secure connection"
    },
    {
      label: "Proxy Connect",
      value: averageMetrics.proxyConnectTime,
      icon: Server,
      color: "orange",
      description: "Time to connect through proxy"
    },
    {
      label: "Proxy Auth",
      value: averageMetrics.proxyAuthTime,
      icon: Layers,
      color: "indigo",
      description: "Time for proxy authentication"
    },
    {
      label: "Request Send",
      value: averageMetrics.requestSendTime,
      icon: Upload,
      color: "cyan",
      description: "Time to send request to server"
    },
    {
      label: "Response Wait",
      value: averageMetrics.responseWaitTime,
      icon: Clock,
      color: "pink",
      description: "Time waiting for server response"
    },
    {
      label: "Download",
      value: averageMetrics.responseDownloadTime,
      icon: Download,
      color: "emerald",
      description: "Time to download response data"
    }
  ];

  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    pink: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex gap-2 flex-wrap">
          {metricItems.slice(0, 4).map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                  colorClasses[item.color as keyof typeof colorClasses]
                )}>
                  <item.icon size={12} />
                  <span className="font-mono">{item.value.toFixed(1)}ms</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Timeline Visualization */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-semibold mb-3 text-gray-200 flex items-center gap-2">
            <Activity size={16} />
            Connection Timeline
          </h4>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-600"></div>
            {metricItems.map((item, index) => {
              const percentage = (item.value / averageMetrics.totalTime) * 100;
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div className="relative pl-6 pb-3 cursor-pointer group">
                      <div className={cn(
                        "absolute left-0 w-2 h-2 rounded-full -translate-x-[3px] top-2",
                        colorClasses[item.color as keyof typeof colorClasses].split(' ')[0].replace('/20', '')
                      )}></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon size={14} className={colorClasses[item.color as keyof typeof colorClasses].split(' ')[1]} />
                          <span className="text-xs text-gray-300">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                colorClasses[item.color as keyof typeof colorClasses].split(' ')[0].replace('/20', '')
                              )}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono text-gray-400">{item.value.toFixed(1)}ms</span>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-xs text-gray-400 mb-1">{item.description}</div>
                      <div className="text-xs font-mono">{percentage.toFixed(1)}% of total time</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Time</span>
              <span className="font-mono font-semibold text-white">{averageMetrics.totalTime.toFixed(1)}ms</span>
            </div>
          </div>
        </div>

        {/* Connection Comparison */}
        {connections.length > 1 && (
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold mb-3 text-gray-200">
              Connection Comparison
            </h4>
            <div className="space-y-2">
              {connections.map((conn, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      conn.sessionReused ? "bg-green-500" : "bg-blue-500"
                    )}></div>
                    <span className="text-gray-400">
                      Connection #{conn.connectionNumber}
                      {conn.isFirstConnection && " (First)"}
                      {conn.sessionReused && " (Reused)"}
                    </span>
                  </div>
                  <span className="font-mono text-gray-300">{conn.totalTime.toFixed(1)}ms</span>
                </div>
              ))}
            </div>
            {result.firstConnectionTime > 0 && result.subsequentConnectionTime > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400">First Connection</span>
                  <span className="font-mono text-blue-300">{result.firstConnectionTime.toFixed(1)}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Subsequent Avg</span>
                  <span className="font-mono text-green-300">{result.subsequentConnectionTime.toFixed(1)}ms</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-400">Improvement</span>
                  <span className="font-mono text-emerald-300">
                    {((1 - result.subsequentConnectionTime / result.firstConnectionTime) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
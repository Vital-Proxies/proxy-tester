"use client";

import React, { useState } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { useProMode } from "@/hooks/useProMode";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { 
  Settings, 
  Zap, 
  Timer, 
  Activity,
  Database,
  Network,
  Eye,
  TrendingUp,
  Layers,
  FileDown,
  BarChart3
} from "lucide-react";

export default function ProMode() {
  const { options, setOptions } = useProxyTesterStore();
  const [isProMode, setIsProMode] = useState(options.proMode || false);
  const { 
    getProModeStats, 
    exportProModeResults,
    proModeResults
  } = useProMode();

  const toggleProMode = (enabled: boolean) => {
    setIsProMode(enabled);
    setOptions({
      ...options,
      proMode: enabled,
      // Set pro mode defaults - ALWAYS test multiple connections for session reuse
      connectionsPerProxy: enabled ? 3 : 1,
      testAllConnections: enabled ? true : false, // Always test all in Pro Mode
      detailedMetrics: enabled,
      connectionPooling: enabled ? true : false, // Always use pooling in Pro Mode
      retryCount: enabled ? 1 : 0,
    });
  };

  const updateProModeOption = (key: string, value: boolean | number) => {
    setOptions({
      ...options,
      [key]: value,
    });
  };

  return (
    <TooltipProvider>
      <div className="w-full rounded-md border bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-3xl border-purple-300/50 px-8 py-6">
        <div className="flex w-full items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap className="text-purple-400" size={24} />
            </div>
            <h3 className="text-2xl font-medium text-purple-100">Pro Mode</h3>
            <span className="bg-purple-400/20 text-purple-200 text-xs px-2 py-1 rounded-full font-medium border border-purple-400/30">
              Advanced Testing
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-purple-200">Enable Pro Mode</span>
            <Switch
              checked={isProMode}
              onCheckedChange={toggleProMode}
              className="data-[state=checked]:bg-purple-500"
            />
          </div>
        </div>

        {isProMode && (
          <div className="space-y-6">
            {/* Connection Testing Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-blue-400/30 bg-blue-500/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="text-blue-400" size={20} />
                  <h4 className="text-base font-semibold text-blue-100">Connection Testing</h4>
                </div>
                
                <div className="space-y-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Connections per proxy</span>
                        <select
                          value={options.connectionsPerProxy || 1}
                          onChange={(e) => updateProModeOption('connectionsPerProxy', parseInt(e.target.value))}
                          className="text-sm border border-gray-600 rounded px-3 py-1 bg-gray-800 text-gray-200"
                        >
                          {[1, 2, 3, 5, 10].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of connections to test per proxy</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Test all connections</span>
                        <Switch
                          checked={options.testAllConnections || false}
                          onCheckedChange={(checked) => updateProModeOption('testAllConnections', checked)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Test all connections instead of stopping at first success</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Connection pooling</span>
                        <Switch
                          checked={options.connectionPooling || false}
                          onCheckedChange={(checked) => updateProModeOption('connectionPooling', checked)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reuse connections for better performance analysis</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Metrics & Analysis Section */}
              <div className="border border-green-400/30 bg-green-500/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="text-green-400" size={20} />
                  <h4 className="text-base font-semibold text-green-100">Metrics & Analysis</h4>
                </div>
                
                <div className="space-y-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Detailed latency metrics</span>
                        <Switch
                          checked={options.detailedMetrics || false}
                          onCheckedChange={(checked) => updateProModeOption('detailedMetrics', checked)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Measure DNS, TCP, TLS, and response times separately</p>
                    </TooltipContent>
                  </Tooltip>


                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Retry attempts</span>
                        <select
                          value={options.retryCount || 0}
                          onChange={(e) => updateProModeOption('retryCount', parseInt(e.target.value))}
                          className="text-sm border border-gray-600 rounded px-3 py-1 bg-gray-800 text-gray-200"
                        >
                          {[0, 1, 2, 3].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of retry attempts for failed connections</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Pro Mode Features */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
              <h4 className="text-base font-semibold mb-4 flex items-center gap-2 text-purple-100">
                <TrendingUp size={16} />
                Pro Mode Features Enabled
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
                  <Timer size={12} />
                  DNS Timing
                </div>
                <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                  <Database size={12} />
                  TCP Connect
                </div>
                <div className="flex items-center gap-2 text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-lg border border-purple-200">
                  <Layers size={12} />
                  TLS Handshake
                </div>
                <div className="flex items-center gap-2 text-xs bg-orange-50 text-orange-700 px-3 py-2 rounded-lg border border-orange-200">
                  <Network size={12} />
                  Proxy Auth
                </div>
                <div className="flex items-center gap-2 text-xs bg-cyan-50 text-cyan-700 px-3 py-2 rounded-lg border border-cyan-200">
                  <Eye size={12} />
                  Session Reuse
                </div>
                <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-200">
                  <Activity size={12} />
                  Connection Pool
                </div>
                <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200">
                  <TrendingUp size={12} />
                  Multi-Protocol
                </div>
                <div className="flex items-center gap-2 text-xs bg-gray-50 text-gray-700 px-3 py-2 rounded-lg border border-gray-200">
                  <Settings size={12} />
                  Advanced Stats
                </div>
              </div>
            </div>

            {/* Pro Mode Stats */}
            {proModeResults.length > 0 && (
              <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold flex items-center gap-2 text-indigo-100">
                    <BarChart3 size={16} />
                    Pro Mode Statistics
                  </h4>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/20"
                          onClick={() => {
                            const data = exportProModeResults('json');
                            if (data) {
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `pro-mode-results-${Date.now()}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}
                        >
                          <FileDown size={14} className="mr-1" />
                          JSON
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export results as JSON</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/20"
                          onClick={() => {
                            const data = exportProModeResults('csv');
                            if (data) {
                              const blob = new Blob([data], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `pro-mode-results-${Date.now()}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}
                        >
                          <FileDown size={14} className="mr-1" />
                          CSV
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export results as CSV</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {(() => {
                  const stats = getProModeStats();
                  if (!stats) return null;
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="text-xs text-gray-400 mb-1">Total Tested</div>
                        <div className="text-lg font-semibold text-white">{stats.total}</div>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3 border border-green-400/30">
                        <div className="text-xs text-green-300 mb-1">Working</div>
                        <div className="text-lg font-semibold text-green-200">{stats.working} ({stats.successRate.toFixed(1)}%)</div>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
                        <div className="text-xs text-blue-300 mb-1">Avg First Connection</div>
                        <div className="text-lg font-semibold text-blue-200">{stats.averageMetrics.firstConnection}ms</div>
                      </div>
                      <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/30">
                        <div className="text-xs text-purple-300 mb-1">Avg Subsequent</div>
                        <div className="text-lg font-semibold text-purple-200">{stats.averageMetrics.subsequentConnection}ms</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-200">
                <strong>⚡ Pro Mode</strong> provides detailed connection analysis and advanced metrics. 
                Testing may take longer but provides comprehensive proxy performance insights perfect for production use.
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

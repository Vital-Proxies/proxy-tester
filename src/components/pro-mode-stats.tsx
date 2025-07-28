"use client";

import { useProMode } from "@/hooks/useProMode";
import { useProxyTesterStore } from "@/store/proxy";
import { Button } from "./ui/button";
import { Download, X } from "lucide-react";

export default function ProModeStats() {
  const { options } = useProxyTesterStore();
  const { getProModeStats, exportProModeResults, proModeResults } = useProMode();

  if (!options.proMode || proModeResults.length === 0) {
    return null;
  }

  const stats = getProModeStats();
  if (!stats) return null;

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportProModeResults(format);
    if (!data) return;

    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pro-mode-results-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-300/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h4 className="text-sm font-medium text-purple-300">Pro Mode Stats</h4>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-gray-400">
                Working: <span className="text-green-400 font-medium">{stats.working}/{stats.total}</span>
              </span>
              <span className="text-xs text-gray-400">
                Success Rate: <span className="text-blue-400 font-medium">{stats.successRate.toFixed(1)}%</span>
              </span>
              <span className="text-xs text-gray-400">
                Avg 1st Conn: <span className="text-orange-400 font-medium">{stats.averageMetrics.firstConnection}ms</span>
              </span>
              <span className="text-xs text-gray-400">
                Avg Next: <span className="text-green-400 font-medium">{stats.averageMetrics.subsequentConnection}ms</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleExport('csv')}
            className="text-xs"
          >
            <Download className="size-3 mr-1" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleExport('json')}
            className="text-xs"
          >
            <Download className="size-3 mr-1" />
            JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
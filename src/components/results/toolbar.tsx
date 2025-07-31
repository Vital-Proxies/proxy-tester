"use client";

import { useProxyTesterStore } from "@/store/proxy";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  Loader2,
  X,
  Zap,
  Trash2,
  Play,
  Square,
  Clock,
  Wifi,
  WifiOff,
  Timer,
  Target,
} from "lucide-react";
import { useApi } from "@/hooks/useApiUrl";
import { Proxy } from "@/types";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { toast } from "sonner";
import { isTauri } from "@tauri-apps/api/core";

export default function ProxyToolbar() {
  const { getUrl, fetch } = useApi();
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const {
    loadedProxies,
    testedProxies,
    testStatus,
    options,
    prepareForTest,
    addTestResult,
    finalizeTest,
    stopTest,
    clearAll,
    setOptions,
  } = useProxyTesterStore();

  const stats = useMemo(() => {
    const working = testedProxies.filter((p) => p.status === "ok").length;
    const failed = testedProxies.filter((p) => p.status === "fail").length;

    const successRate =
      testedProxies.length > 0 ? (working / testedProxies.length) * 100 : 0;

    return {
      working,
      failed,
      successRate: Math.round(successRate * 10) / 10,
    };
  }, [testedProxies]);

  // Timer for elapsed time during testing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (testStatus === "testing") {
      if (!testStartTime) {
        setTestStartTime(Date.now());
      }
      interval = setInterval(() => {
        setElapsedTime(Date.now() - (testStartTime || Date.now()));
      }, 100);
    } else if (testStatus === "idle") {
      setTestStartTime(null);
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testStatus, testStartTime]);

  const runTest = async () => {
    if (loadedProxies.length === 0 || testStatus === "testing") return;

    if (options.targetUrl.trim() === "") {
      toast.error("Please enter a target URL before testing", {
        duration: 3000,
      });
      return;
    }

    const controller = new AbortController();
    prepareForTest(controller);

    setTestStartTime(0);
    setElapsedTime(0);

    try {
      const response = await fetch(isTauri())(getUrl("/proxy-check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          proxies: loadedProxies,
          options: { ...options },
        }),
      });

      if (!response.body) {
        throw new Error("Response body is empty.");
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const lines = value.split("\n\n").filter(Boolean);
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const result: Proxy = JSON.parse(line.substring(6));
            addTestResult({ ...result });
            console.log(result);
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Test stopped by user.");
      } else {
        console.error("Test failed:", error);
      }
    } finally {
      finalizeTest();
    }
  };

  const isTestActive = testStatus === "testing" || testStatus === "stopping";
  const progress =
    loadedProxies.length > 0
      ? (testedProxies.length / loadedProxies.length) * 100
      : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const estimatedTimeLeft = useMemo(() => {
    if (testStatus !== "testing" || testedProxies.length === 0) return null;

    const avgTimePerProxy = elapsedTime / testedProxies.length;
    const remaining = loadedProxies.length - testedProxies.length;
    return avgTimePerProxy * remaining;
  }, [testStatus, testedProxies.length, loadedProxies.length, elapsedTime]);

  const handleClear = () => {
    clearAll();
    setTestStartTime(0);
    setElapsedTime(0);
  };

  return (
    <TooltipProvider>
      <div className="flex w-full items-center justify-between p-4 rounded-lg backdrop-blur-lg">
        {/* Left Side - Status & Progress */}
        <div className="flex items-center gap-6">
          {/* Primary Status Indicator */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {testStatus === "testing" && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative cursor-help">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      <div className="absolute inset-0 w-5 h-5 rounded-full border border-blue-400/30" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Testing in Progress</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Analyzing {loadedProxies.length} proxies for connectivity
                      and performance
                    </p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">
                    Testing Proxies
                  </span>
                  <span className="text-xs text-gray-400">
                    {testedProxies.length} of {loadedProxies.length} completed
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="w-32 h-1.5 bg-white/10 backdrop-blur-3xl rounded-full overflow-hidden mt-1 cursor-help"
                        initial={{ width: 0 }}
                        animate={{ width: 128 }}
                      >
                        <motion.div
                          className="h-full bg-accent rounded-none"
                          initial={{ width: "0%" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">
                        Progress: {progress.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {testedProxies.length} completed •{" "}
                        {loadedProxies.length - testedProxies.length} remaining
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}

            {testStatus === "stopping" && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative cursor-help">
                      <Square className="w-5 h-5 text-red-400 fill-current" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Stopping Test</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Gracefully stopping the test and finalizing results
                    </p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">
                    Stopping
                  </span>
                  <span className="text-xs text-gray-400">
                    Finalizing results...
                  </span>
                </div>
              </>
            )}

            {testStatus === "finished" && (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  Test Complete
                </span>
                <span className="text-xs text-gray-400">
                  {testedProxies.length} proxies tested
                </span>
              </div>
            )}

            {testStatus === "idle" && (
              <>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      Ready
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary mt-2">
                    {loadedProxies.length}{" "}
                    {loadedProxies.length === 1 ? "proxy" : "proxies"} loaded
                  </span>
                </div>
              </>
            )}
          </motion.div>

          {/* Live Statistics */}
          {(testStatus === "testing" || testStatus === "finished") &&
            testedProxies.length > 0 && (
              <motion.div
                className="flex items-center gap-4 pl-4 border-l border-white/10"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Success/Fail Count */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <Wifi className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">
                          {stats.working}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Working Proxies</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help ml-1">
                        <WifiOff className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400 font-medium">
                          {stats.failed}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Failed Proxies</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Success Rate */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <Target className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">
                        {stats.successRate}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Success Rate</p>

                    <div className="text-xs text-text-secondary mt-2">
                      {stats.working} working out of {testedProxies.length}{" "}
                      tested
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}

          {/* Timer & ETA */}
          {testStatus === "testing" && (
            <motion.div
              className="flex items-center gap-4 pl-4 border-l border-white/10"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <Timer className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">Elapsed Time</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Time since the test started
                  </p>
                  <div className="text-xs text-gray-300 mt-2">
                    Average:{" "}
                    {testedProxies.length > 0
                      ? (elapsedTime / testedProxies.length / 1000).toFixed(1)
                      : "0"}
                    s per proxy
                  </div>
                </TooltipContent>
              </Tooltip>

              {estimatedTimeLeft && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">
                        ~{formatTime(estimatedTimeLeft)} left
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Estimated Time Remaining</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Based on current testing speed
                    </p>
                    <div className="text-xs text-gray-300 mt-2">
                      {loadedProxies.length - testedProxies.length} proxies
                      remaining
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={handleClear}
            disabled={isTestActive}
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>

          {testStatus === "testing" ? (
            <Button
              variant="destructive"
              size="lg"
              onClick={stopTest}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
            >
              <Square className="w-4 h-4 mr-2 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={runTest}
              disabled={loadedProxies.length === 0 || isTestActive}
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Run Test
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

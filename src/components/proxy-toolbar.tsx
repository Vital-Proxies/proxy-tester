"use client";

import { useProxyTesterStore } from "@/store/proxy";
import { ProxyResult, ProModeTestResult } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, X, Zap } from "lucide-react";
import { useApi } from "@/hooks/useApiUrl";
import { isTauri } from "@tauri-apps/api/core";

export default function ProxyToolbar() {
  const { getUrl } = useApi();

  const {
    loadedProxies,
    testedProxies,
    testStatus,
    options,
    // Actions
    prepareForTest,
    addTestResult,
    finalizeTest,
    stopTest,
    clearAll,
  } = useProxyTesterStore();

  const runTest = async () => {
    if (loadedProxies.length === 0 || testStatus === "testing") return;

    const controller = new AbortController();
    prepareForTest(controller);

    try {
      // Use appropriate fetch based on environment
      const fetchFunction = isTauri() 
        ? (await import("@tauri-apps/plugin-http")).fetch 
        : globalThis.fetch;
      
      // Choose endpoint based on Pro Mode
      const endpoint = options.proMode ? "/api/test-proxies-pro-batch" : "/api/proxy-check";
      
      const response = await fetchFunction(getUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          proxies: loadedProxies.map(p => p.raw || p.formatted),
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
            if (options.proMode) {
              // Handle Pro Mode result
              const proResult: ProModeTestResult = JSON.parse(line.substring(6));
              console.log('Pro Mode Result:', proResult); // Debug log
              
              // Ensure we have a valid proxy string
              const proxyString = proResult.proxy || 'Unknown Proxy';
              
              addTestResult({
                raw: String(proxyString),
                formatted: String(proxyString),
                protocol: proResult.protocol || 'unknown',
                status: proResult.status || 'fail',
                ip: proResult.exitIp,
                country: proResult.geolocation?.country,
                countryCode: proResult.geolocation?.countryCode,
                isp: proResult.geolocation?.isp,
                city: proResult.geolocation?.city,
                latency: proResult.firstConnectionTime,
                proModeResult: proResult,
                detailedMetrics: proResult.averageMetrics,
                connectionsCount: proResult.connections?.length || 0,
                errorDetails: proResult.errorDetails,
              });
            } else {
              // Handle normal result
              const result: ProxyResult = JSON.parse(line.substring(6));
              console.log('Normal Result:', result); // Debug log
              
              // Ensure we have valid proxy strings
              const rawProxy = result.raw || 'Unknown Proxy';
              const formattedProxy = result.formatted || rawProxy;
              
              addTestResult({
                ...result,
                raw: String(rawProxy),
                formatted: String(formattedProxy),
                protocol: result.protocol || 'unknown',
                status: result.status || 'fail',
              });
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Test successfully stopped by user.");
      } else {
        console.error("Test run failed:", error);
      }
    } finally {
      finalizeTest();
    }
  };

  const isTestActive = testStatus === "testing" || testStatus === "stopping";

  return (
    <div className="z-20 transition-all duration-200 ease-in-out text-text-secondary py-6">
      <div className="w-full flex items-center justify-between px-1 py-2">
        <div className="flex min-w-[250px] items-center gap-2 text-sm ">
          {testStatus === "testing" && (
            <Loader2 className="size-4 animate-spin text-blue-500" />
          )}
          {testStatus === "stopping" && (
            <Loader2 className="size-4 animate-spin text-red-500" />
          )}
          {testStatus === "finished" && (
            <CheckCircle className="size-4 text-green-500" />
          )}

          <span>
            {testStatus === "idle" &&
              `${loadedProxies.length} ${
                loadedProxies.length === 1 ? "proxy" : "proxies"
              } loaded`}
            {testStatus === "testing" &&
              `Testing... (${testedProxies.length}/${loadedProxies.length})`}
            {testStatus === "stopping" && "Stopping test..."}
            {testStatus === "finished" &&
              `Test finished. ${testedProxies.length} proxies tested.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size={"lg"}
            variant="ghost"
            onClick={clearAll}
            disabled={isTestActive}
          >
            Clear All
          </Button>

          {testStatus === "testing" ? (
            <Button variant="destructive" onClick={stopTest}>
              <X className="mr-2 size-4" />
              Stop
            </Button>
          ) : (
            <Button
              size="lg"
              variant="default"
              onClick={runTest}
              disabled={loadedProxies.length === 0 || isTestActive}
            >
              <Zap className="mr-2 size-4" />
              Run Test
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

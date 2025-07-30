import { useState, useCallback } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { ProModeTestResult } from "@/types";

export const useProMode = () => {
  const { options, testProxyProMode, testProxiesProModeBatch } =
    useProxyTesterStore();
  const [isProModeTesting, setIsProModeTesting] = useState(false);
  const [proModeResults, setProModeResults] = useState<ProModeTestResult[]>([]);
  const [proModeProgress, setProModeProgress] = useState(0);

  const isProModeEnabled = options.proMode || false;

  const testSingleProxyProMode = useCallback(
    async (proxy: string) => {
      if (!isProModeEnabled) {
        throw new Error("Pro Mode is not enabled");
      }

      setIsProModeTesting(true);
      try {
        const result = await testProxyProMode(proxy);
        setProModeResults((prev) => [...prev, result]);
        return result;
      } finally {
        setIsProModeTesting(false);
      }
    },
    [isProModeEnabled, testProxyProMode]
  );

  const testMultipleProxiesProMode = useCallback(
    async (proxies: string[]) => {
      if (!isProModeEnabled) {
        throw new Error("Pro Mode is not enabled");
      }

      setIsProModeTesting(true);
      setProModeResults([]);
      setProModeProgress(0);

      try {
        const results = await testProxiesProModeBatch(proxies, (result) => {
          setProModeResults((prev) => [...prev, result]);
          setProModeProgress((prev) => prev + 1);
        });

        return results;
      } finally {
        setIsProModeTesting(false);
        setProModeProgress(0);
      }
    },
    [isProModeEnabled, testProxiesProModeBatch]
  );

  const clearProModeResults = useCallback(() => {
    console.log("Clearing Pro Mode results");
    setProModeResults([]);
    setProModeProgress(0);
  }, []);

  const getProModeStats = useCallback(() => {
    console.log(proModeResults.length);
    if (proModeResults.length === 0) {
      return null;
    }

    const workingProxies = proModeResults.filter((r) => r.status === "ok");
    const failedProxies = proModeResults.filter((r) => r.status === "fail");

    const avgFirstConnection =
      workingProxies.length > 0
        ? workingProxies.reduce((sum, r) => sum + r.firstConnectionTime, 0) /
          workingProxies.length
        : 0;

    const avgSubsequentConnection =
      workingProxies.length > 0
        ? workingProxies.reduce(
            (sum, r) =>
              sum + (r.subsequentConnectionTime || r.firstConnectionTime),
            0
          ) / workingProxies.length
        : 0;

    const avgDns =
      workingProxies.length > 0
        ? workingProxies.reduce(
            (sum, r) => sum + r.averageMetrics.dnsLookupTime,
            0
          ) / workingProxies.length
        : 0;

    const avgTcp =
      workingProxies.length > 0
        ? workingProxies.reduce(
            (sum, r) => sum + r.averageMetrics.tcpConnectTime,
            0
          ) / workingProxies.length
        : 0;

    const avgTls =
      workingProxies.length > 0
        ? workingProxies.reduce(
            (sum, r) => sum + r.averageMetrics.tlsHandshakeTime,
            0
          ) / workingProxies.length
        : 0;

    const avgProxy =
      workingProxies.length > 0
        ? workingProxies.reduce(
            (sum, r) => sum + r.averageMetrics.proxyConnectTime,
            0
          ) / workingProxies.length
        : 0;

    const avgResponse =
      workingProxies.length > 0
        ? workingProxies.reduce(
            (sum, r) => sum + r.averageMetrics.responseDownloadTime,
            0
          ) / workingProxies.length
        : 0;

    return {
      total: proModeResults.length,
      working: workingProxies.length,
      failed: failedProxies.length,
      successRate:
        proModeResults.length > 0
          ? (workingProxies.length / proModeResults.length) * 100
          : 0,
      averageMetrics: {
        firstConnection: Math.round(avgFirstConnection),
        subsequentConnection: Math.round(avgSubsequentConnection),
        dns: Math.round(avgDns),
        tcp: Math.round(avgTcp),
        tls: Math.round(avgTls),
        proxy: Math.round(avgProxy),
        response: Math.round(avgResponse),
        total: Math.round((avgFirstConnection + avgSubsequentConnection) / 2),
      },
    };
  }, [proModeResults]);

  const getDetailedProxyMetrics = useCallback(
    (proxy: string) => {
      const result = proModeResults.find((r) => r.proxy === proxy);
      return result?.connections || [];
    },
    [proModeResults]
  );

  const exportProModeResults = useCallback(
    (format: "json" | "csv" = "json") => {
      if (proModeResults.length === 0) {
        return null;
      }

      if (format === "json") {
        return JSON.stringify(proModeResults, null, 2);
      }

      // CSV format
      const headers = [
        "Proxy",
        "Status",
        "Exit IP",
        "Country",
        "City",
        "ISP",
        "Test Method",
        "Connections Count",
        "First Connection (ms)",
        "Subsequent Connection (ms)",
        "DNS (ms)",
        "TCP (ms)",
        "TLS (ms)",
        "Proxy Connect (ms)",
        "Response (ms)",
        "Total Avg (ms)",
      ];

      const rows = proModeResults.map((result) => [
        result.proxy,
        result.status,
        result.exitIp || "",
        result.geolocation?.country || "",
        result.geolocation?.city || "",
        result.geolocation?.isp || "",
        "Low-Level",
        result.connections.length,
        Math.round(result.firstConnectionTime),
        Math.round(
          result.subsequentConnectionTime || result.firstConnectionTime
        ),
        Math.round(result.averageMetrics.dnsLookupTime),
        Math.round(result.averageMetrics.tcpConnectTime),
        Math.round(result.averageMetrics.tlsHandshakeTime),
        Math.round(result.averageMetrics.proxyConnectTime),
        Math.round(result.averageMetrics.responseDownloadTime),
        Math.round(result.averageMetrics.totalTime),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      return csvContent;
    },
    [proModeResults]
  );

  return {
    // State
    isProModeEnabled,
    isProModeTesting,
    proModeResults,
    proModeProgress,

    // Actions
    testSingleProxyProMode,
    testMultipleProxiesProMode,
    clearProModeResults,

    // Computed
    getProModeStats,
    getDetailedProxyMetrics,
    exportProModeResults,

    // Pro Mode configuration
    proModeConfig: {
      connectionsPerProxy: options.connectionsPerProxy || 1,
      testAllConnections: options.testAllConnections || false,
      detailedMetrics: options.detailedMetrics || false,
      connectionPooling: options.connectionPooling || false,
      retryCount: options.retryCount || 0,
    },
  };
};

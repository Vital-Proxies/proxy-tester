import { ProxyTesterOptions, ProModeTestResult } from "@/types";
import { lowLevelProxyTester } from "./lowLevelProxyTester";

interface ProModeTestingOptions extends ProxyTesterOptions {
  connectionsPerProxy?: number;
  testAllConnections?: boolean;
  detailedMetrics?: boolean;
  connectionPooling?: boolean;
  retryCount?: number;
  customTimeout?: number;
}

// Pro Mode proxy tester - uses low-level sockets for detailed metrics
export class ProModeServerTester {
  async testProxyProMode(
    proxyString: string,
    options: ProModeTestingOptions
  ): Promise<ProModeTestResult> {
    const {
      targetUrl,
      connectionsPerProxy = 3, // Pro Mode always tests at least 3 connections
      testAllConnections = true, // Pro Mode always tests all connections
      detailedMetrics = true,
      connectionPooling = true, // Always active in Pro Mode for session reuse
      retryCount = 1,
      customTimeout = 10000
    } = options;

    // Always use low-level tester in Pro Mode for detailed metrics
    return await lowLevelProxyTester.testProxyLowLevel(proxyString, targetUrl, {
      connectionsPerProxy,
      testAllConnections,
      timeout: customTimeout,
      sessionReuse: connectionPooling,
      ipLookup: options.ipLookup
    });
  }

  cleanup() {
    lowLevelProxyTester.cleanup();
  }
}

// Export singleton instance
export const proModeServerTester = new ProModeServerTester();
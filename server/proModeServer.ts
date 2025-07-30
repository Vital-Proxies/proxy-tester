import { Proxy, ProxyTesterOptions, ProxyProtocol, ProxyStatus } from "@/types";
import { enhancedProxyTester } from "./requests/proxy-tester";

// Pro Mode proxy tester - uses low-level sockets for detailed metrics
export class ProModeServerTester {
  /**
   * Test multiple proxies in Pro Mode (works with single proxy too)
   */
  async testMultipleProxies(
    proxies: Proxy[], // Use Proxy objects directly instead of strings
    options: ProxyTesterOptions
  ): Promise<Proxy[]> {
    const results: Proxy[] = [];

    for (const proxy of proxies) {
      let result: Proxy;
      let lastError: Error | null = null;
      let success = false;

      // Retry logic using options.proMode.retryCount
      for (
        let attempt = 1;
        attempt <= options.proMode.retryCount + 1 && !success;
        attempt++
      ) {
        try {
          // Use the existing testProxyDetailed method
          result = await enhancedProxyTester.testProxyDetailed(proxy, {
            ...options,
            proMode: {
              ...options.proMode,
              customTimeout: options.proMode.customTimeout * attempt, // Increase timeout on retries
            },
          });

          if (result.status === "ok") {
            success = true;
            results.push(result);
          } else if (result.error?.code !== "TIMEOUT" && attempt === 1) {
            // Don't retry non-timeout errors on first attempt
            results.push(result);
            success = true;
          } else {
            lastError = new Error(result.error?.message || "Test failed");
          }
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error("Unknown error");

          if (attempt < options.proMode.retryCount + 1) {
            // Wait before retry (exponential backoff)
            await this.delay(1000 * attempt);
          }
        }
      }

      // If all retries failed, add failure result
      if (!success) {
        results.push({
          ...proxy,
          status: "fail" as ProxyStatus,
          error: {
            message: lastError?.message || "All retry attempts failed",
            code: "MAX_RETRIES_EXCEEDED",
            suggestion: "Try a different proxy or check network connectivity",
          },
        });
      }
    }

    return results;
  }

  /**
   * Get detailed statistics from the enhanced proxy tester
   */
  getStats() {
    return enhancedProxyTester.getStats();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    enhancedProxyTester.cleanup();
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const proModeServerTester = new ProModeServerTester();

// Export the main function for backward compatibility
export default async function proModeCheckProxy(
  proxy: Proxy,
  options: ProxyTesterOptions
): Promise<Proxy> {
  return enhancedProxyTester.testProxyDetailed(proxy, options);
}

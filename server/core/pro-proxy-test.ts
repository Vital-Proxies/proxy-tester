import { Proxy, ProxyTesterOptions, ProxyStatus } from "@/types";
import { enhancedProxyTester } from "../requests/proxy-tester";

/**
 * Pro Mode: Detailed proxy testing with comprehensive metrics
 * Tests a single proxy with retry logic and returns the result
 */
export async function testProMode(
  proxy: Proxy,
  options: ProxyTesterOptions
): Promise<Proxy> {
  console.debug(`🔬 Pro Mode: Testing ${proxy.formatted}`);

  let result: Proxy;
  let lastError: Error | null = null;
  let success = false;

  for (
    let attempt = 1;
    attempt <= (options.proMode?.retryCount || 0) + 1 && !success;
    attempt++
  ) {
    try {
      // Use the existing testProxyDetailed method
      result = await enhancedProxyTester.testProxyDetailed(proxy, {
        ...options,
        proMode: {
          ...options.proMode,
          customTimeout: (options.proMode?.customTimeout || 15000) * attempt, // Increase timeout on retries
        },
      });

      if (result.status === "ok") {
        success = true;
        console.debug(
          `✅ Pro Mode: ${proxy.formatted} succeeded on attempt ${attempt}`
        );
        return result;
      } else if (result.error?.code !== "TIMEOUT" && attempt === 1) {
        // Don't retry non-timeout errors on first attempt
        success = true;
        console.debug(
          `❌ Pro Mode: ${proxy.formatted} failed (${result.error?.code})`
        );
        return result;
      } else {
        lastError = new Error(result.error?.message || "Test failed");
        console.debug(
          `⚠️ Pro Mode: ${proxy.formatted} attempt ${attempt} failed, retrying...`
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (attempt < (options.proMode?.retryCount || 0) + 1) {
        // Wait before retry (exponential backoff)
        await delay(1000 * attempt);
      }
    }
  }

  // If all retries failed, return failure result
  console.debug(`❌ Pro Mode: ${proxy.formatted} failed after all retries`);
  return {
    ...proxy,
    status: "fail" as ProxyStatus,
    error: {
      message: lastError?.message || "All retry attempts failed",
      code: "MAX_RETRIES_EXCEEDED",
      suggestion: "Try a different proxy or check network connectivity",
    },
  };
}

/**
 * Get detailed statistics from the enhanced proxy tester
 */
export function getProModeStats() {
  return enhancedProxyTester.getStats();
}

/**
 * Clean up Pro Mode resources
 */
export function cleanupProMode() {
  console.debug("🧹 Pro Mode: Cleaning up resources");
  enhancedProxyTester.cleanup();
}

/**
 * Helper function for delays
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export the main function as default
export default testProMode;

import { Proxy, ProxyError, ProxyProtocol, ProxyTesterOptions } from "@/types";
import { enhancedProxyTester } from "../requests/proxy-tester";

/**
 * Simple Mode: Fast basic proxy testing with optional IP lookup
 * Tests a single proxy and returns the result
 */
export async function testSimpleMode(
  proxy: Proxy,
  options: ProxyTesterOptions
): Promise<Proxy> {
  console.debug(`⚡ Simple Mode: Testing ${proxy.formatted}`);

  const controller = new AbortController();
  const timeout = 8000; // Simple mode timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Test basic connectivity
    const connectivityResult = await testBasicConnectivity(
      proxy,
      options.targetUrl,
      timeout
    );

    if (!connectivityResult.success) {
      return {
        ...proxy,
        status: "fail",
        error: connectivityResult.error,
      };
    }

    // Build successful result
    const result: Proxy = {
      ...proxy,
      status: "ok",
      protocol: connectivityResult.protocol,
      latency: connectivityResult.latency,
      simpleData: null,
      proDetails: null,
      error: null,
    };

    // Optional IP lookup
    if (options.simpleMode.ipLookup) {
      try {
        const ipData = await enhancedProxyTester.getExitIpAndGeoOptimized(
          proxy.raw,
          5000, // Fast IP lookup timeout
          connectivityResult.protocol,
          true // Get geolocation
        );

        if (ipData && ipData.ip) {
          result.simpleData = {
            ip: ipData.ip,
            country: ipData.geolocation?.country || "Unknown",
            countryCode: ipData.geolocation?.countryCode || "XX",
            city: ipData.geolocation?.city || "Unknown",
            isp: ipData.geolocation?.isp || "Unknown",
          };
        } else {
          result.status = "fail";

          result.simpleData = {
            ip: "Could not retrieve IP",
            country: "Unknown",
            countryCode: "XX",
            city: "Unknown",
            isp: "Unknown",
          };

          result.error = {
            message: "IP lookup failed",
            code: "IP_LOOKUP_FAILED",
            suggestion:
              "We could not retrieve IP information, but the proxy is functional.",
          };
        }
      } catch (error) {
        result.simpleData = {
          ip: "Could not retrieve IP",
          country: "Unknown",
          countryCode: "XX",
          city: "Unknown",
          isp: "Unknown",
        };
        result.status = "fail";
        result.error = {
          message: "IP lookup failed",
          code: "IP_LOOKUP_ERROR",
          suggestion: "Check proxy configuration and try again",
          protocolsTried: [connectivityResult.protocol],
        };
      }
    }

    console.debug(
      `✅ Simple Mode: ${proxy.formatted} completed (${result.latency}ms)`
    );
    return result;
  } catch (error: any) {
    if (error.name === "AbortError") {
      return {
        ...proxy,
        status: "fail",
        error: {
          message: "Test timeout exceeded",
          code: "TIMEOUT",
          suggestion: "Proxy may be too slow or unresponsive",
        },
      };
    }

    return {
      ...proxy,
      status: "fail",
      error: {
        message: error.message || "Unexpected error",
        code: "UNEXPECTED_ERROR",
        suggestion: "Check proxy configuration and try again",
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Test basic connectivity - internal helper function
async function testBasicConnectivity(
  proxy: Proxy,
  targetUrl: string,
  timeout: number
): Promise<{
  success: boolean;
  protocol: ProxyProtocol;
  latency: number;
  error: ProxyError | null;
}> {
  const startTime = performance.now();

  // Parse proxy
  const parsedProxy = enhancedProxyTester.parseProxyString(proxy.raw);
  if (!parsedProxy) {
    return {
      success: false,
      protocol: "unknown",
      latency: 0,
      error: {
        message: "Invalid proxy format",
        code: "INVALID_FORMAT",
        suggestion: "Use format: user:pass@host:port or host:port",
      },
    };
  }

  const protocolsToTry =
    proxy.protocol !== "unknown"
      ? [proxy.protocol]
      : enhancedProxyTester.getOptimalProtocolOrder(proxy.raw);

  // Try protocols until one works
  for (const protocol of protocolsToTry) {
    try {
      const targetUrlParsed = new URL(targetUrl);

      // Create proxy connection
      const socket = await enhancedProxyTester.createProxyConnection(
        parsedProxy.host,
        parsedProxy.port,
        parsedProxy.username,
        parsedProxy.password,
        targetUrlParsed,
        protocol,
        timeout,
        {} // Empty timings object for simple mode
      );

      // Send HTTP request
      const timings = {};
      await enhancedProxyTester.sendHttpRequestOptimized(
        socket,
        targetUrlParsed,
        timings,
        protocol === "http",
        true,
        parsedProxy.username && parsedProxy.password
          ? {
              username: parsedProxy.username,
              password: parsedProxy.password,
            }
          : undefined
      );

      // Cleanup
      enhancedProxyTester.destroySocket(socket);

      const latency = Math.round(performance.now() - startTime);

      return {
        success: true,
        protocol,
        latency,
        error: null,
      };
    } catch (error: any) {
      console.debug(`Protocol ${protocol} failed:`, error.message);

      // If this was the only protocol to try, return the error
      if (protocolsToTry.length === 1) {
        const latency = Math.round(performance.now() - startTime);
        return {
          success: false,
          protocol,
          latency,
          error: enhancedProxyTester.detectProxyError(error, proxy),
        };
      }
      // Otherwise, continue to next protocol
    }
  }

  // All protocols failed
  const latency = Math.round(performance.now() - startTime);
  return {
    success: false,
    protocol: "unknown",
    latency,
    error: {
      message: "All protocols failed",
      code: "ALL_PROTOCOLS_FAILED",
      suggestion: "Check proxy configuration and credentials",
      protocolsTried: protocolsToTry,
    },
  };
}

// Export the main function as default
export default testSimpleMode;

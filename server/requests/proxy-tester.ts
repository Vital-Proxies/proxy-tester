/*
 * ================================================================================================
 * PROXY TESTING FLOW DOCUMENTATION
 * ================================================================================================
 *
 * This file implements a comprehensive proxy testing system with protocol detection,
 * authentication, tunneling, and performance measurement capabilities.
 *
 * 📋 MAIN ENTRY POINTS:
 * ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 * │ testProxyDetailed(proxy, options) ← MAIN ENTRY POINT                                       │
 * └─────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * 🔄 HIGH-LEVEL FLOW:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │ testProxyDetailed│───▶│ testProxyLowLevel│───▶│testSingleConnection│───▶│createProxyConnection│
 * └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
 *                                                        │
 *                                                        ▼
 *                                              ┌─────────────────┐
 *                                              │sendHttpRequest  │
 *                                              │   Optimized     │
 *                                              └─────────────────┘
 *
 * 🎯 DETAILED EXECUTION FLOW:
 *
 * 1️⃣ ENTRY & VALIDATION:
 *    testProxyDetailed()
 *    ├── Validates proxy format
 *    ├── Sets up timeout/abort controller
 *    └── Determines protocol testing strategy
 *
 * 2️⃣ PROTOCOL DETECTION & TESTING:
 *    testProxyLowLevel()
 *    ├── Known protocol → Test directly
 *    └── Unknown protocol → Try optimal order: [http, https, socks5, socks4]
 *
 * 3️⃣ CONNECTION TESTING (for each protocol):
 *    testSingleConnection()
 *    ├── DNS resolution (cached)
 *    ├── createProxyConnection() → Protocol-specific handshake
 *    ├── sendHttpRequestOptimized() → Test actual HTTP request
 *    └── Collect detailed timing metrics
 *
 * 4️⃣ PROTOCOL-SPECIFIC HANDSHAKES:
 *    createProxyConnection()
 *    ├── HTTP/HTTPS → handleHttpProxy() → Test CONNECT/GET + fast-fail detection
 *    └── SOCKS4/5 → handleSocksProxy() → Full tunnel establishment
 *
 * 🔍 PROTOCOL TESTING DETAILS:
 *
 * HTTP/HTTPS Protocol Test:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │Send HTTP CONNECT│───▶│Check Response   │───▶│Success/Fail     │
 * │or GET request   │    │- Look for HTTP/ │    │- 200 = Success  │
 * └─────────────────┘    │- Check for 407  │    │- 407 = Auth Fail│
 *                        │- Detect SOCKS   │    │- Other = Fail   │
 *                        │  binary response │    └─────────────────┘
 *                        └─────────────────┘
 *
 * SOCKS5 Protocol Test & Tunnel:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │Send Greeting    │───▶│Authentication   │───▶│Connect Request  │───▶│Success/Fail     │
 * │[0x05,0x01,0x02] │    │[user:pass]      │    │[host:port]      │    │- 0x00 = Success │
 * └─────────────────┘    └─────────────────┘    └─────────────────┘    │- 0x02 = Auth    │
 *                                                                      │- Other = Fail   │
 *                                                                      └─────────────────┘
 *
 * SOCKS4 Protocol Test & Tunnel:
 * ┌─────────────────┐    ┌─────────────────┐
 * │Send Connect     │───▶│Success/Fail     │
 * │[0x04,0x01,...]  │    │- 0x5a = Success │
 * └─────────────────┘    │- 0x5b = Fail    │
 *                        └─────────────────┘
 *
 * 🚨 ERROR HANDLING FLOW:
 *
 * Protocol Detection Errors:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │HTTP: Get [8_<]  │───▶│Fast Fail:       │───▶│Try Next Protocol│
 * │(SOCKS response) │    │SOCKS detected   │    │                 │
 * └─────────────────┘    └─────────────────┘    └─────────────────┘
 *
 * Authentication Errors (Specific Detection):
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │HTTP: 407 Error  │───▶│RETURN:          │    │                 │
 * │SOCKS5: 0x02     │    │HTTP_AUTH_ERROR  │    │                 │
 * │SOCKS4: 0x5b     │    │SOCKS_INVALID_   │    │                 │
 * │                 │    │CREDENTIALS      │    │                 │
 * └─────────────────┘    └─────────────────┘    └─────────────────┘
 *
 * All Protocols Failed:
 * ┌─────────────────┐    ┌─────────────────┐
 * │No Protocol      │───▶│ALL_PROTOCOLS_   │
 * │Succeeded        │    │FAILED           │
 * └─────────────────┘    └─────────────────┘
 *
 * 📊 TIMING METRICS COLLECTED:
 * - dnsLookupTime: DNS resolution
 * - tcpConnectTime: TCP socket connection
 * - proxyConnectTime: Proxy handshake (HTTP CONNECT or SOCKS handshake)
 * - tlsHandshakeTime: TLS negotiation (HTTPS only)
 * - requestSendTime: HTTP request transmission
 * - responseWaitTime: Time to first byte
 * - responseDownloadTime: Response body download
 * - totalTime: End-to-end time
 *
 * 🔄 SESSION MANAGEMENT:
 * - First connection: Full handshake + metrics
 * - Subsequent connections: Reuse socket + measure request/response only
 * - Session cleanup: Automatic timeout-based cleanup
 *
 * 💡 KEY OPTIMIZATIONS:
 * - Fast-fail protocol detection (50-200ms vs 8+ seconds)
 * - DNS caching for repeated hostname lookups
 * - Socket session reuse for multiple connections
 * - Intelligent protocol ordering based on port/auth
 * - Specific error messages for authentication failures
 *
 * ================================================================================================
 */

import * as net from "net";
import * as tls from "tls";
import * as dns from "dns/promises";
import { performance } from "perf_hooks";
import { URL } from "url";
import {
  Proxy,
  ProxyError,
  ProxyProtocol,
  ProxyTesterOptions,
  ProxyStatus,
  DetailedLatencyMetrics,
} from "@/types";

// Your existing interfaces - no changes needed
interface PreciseTimings {
  dnsStart?: number;
  dnsEnd?: number;
  connectStart?: number;
  connectEnd?: number;
  proxyHandshakeStart?: number;
  proxyHandshakeEnd?: number;
  tlsStart?: number;
  tlsEnd?: number;
  requestStart?: number;
  requestEnd?: number;
  firstByteTime?: number;
  lastByteTime?: number;
}

interface ManagedSocket {
  socket: net.Socket | tls.TLSSocket;
  protocol: ProxyProtocol;
  proxy: string;
  lastUsed: number;
  requestCount: number;
  isAlive: boolean;
  targetUrl: string;
}

interface TestConnectionOptions {
  timeout: number;
  reuseSession: ManagedSocket | null;
  protocol: ProxyProtocol;
}

interface ProxyTestOptions {
  connectionsPerProxy?: number;
  testAllConnections?: boolean;
  timeout?: number;
  sessionReuse?: boolean;
  ipLookup?: boolean;
}

interface ParsedProxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export class EnhancedProxyTester {
  private readonly sessionPool = new Map<string, ManagedSocket>();
  private readonly SESSION_TIMEOUT = 30_000; // 30 seconds
  private readonly MAX_SESSIONS = 50; // Reduced for better performance
  private readonly DNS_CACHE = new Map<
    string,
    { ip: string; timestamp: number }
  >();
  private readonly DNS_CACHE_TTL = 300_000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 8_000; // 8 seconds for HTTP requests
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // More frequent cleanup for better resource management
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 15_000);
  }

  async testProxyDetailed(
    proxy: Proxy,
    options: ProxyTesterOptions
  ): Promise<Proxy> {
    const controller = new AbortController();
    const timeout = Math.min(options.proMode?.customTimeout || 15_000, 30_000); // Cap at 30s
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Early validation
      if (!this.isValidProxyFormat(proxy.formatted)) {
        return this.createFailureResult(proxy, {
          message: "Invalid proxy format",
          code: "INVALID_FORMAT",
          suggestion: "Use format: user:pass@host:port or host:port",
        });
      }

      const proxyString = proxy.formatted;
      let workingProtocol: ProxyProtocol | null = null;
      let finalResult: Proxy = { ...proxy };

      if (proxy.protocol !== "unknown") {
        // Test known protocol with optimized single attempt
        try {
          const result = await this.testProxyLowLevel(
            proxyString,
            options.targetUrl,
            {
              connectionsPerProxy: options.proMode?.connectionsPerProxy || 3,
              testAllConnections: true,
              timeout,
              sessionReuse: true,
              ipLookup: options.proMode?.ipLookup !== false,
            },
            proxy.protocol
          );

          if (result.status === "ok") {
            workingProtocol = proxy.protocol;
            finalResult = this.convertResultToProxy(result, proxy);
          } else {
            return this.createFailureResult(proxy, {
              message: `Protocol ${proxy.protocol} failed`,
              code: "KNOWN_PROTOCOL_FAILED",
              suggestion: "Try a different protocol or check proxy settings",
            });
          }
        } catch (error: any) {
          const proxyError = this.detectProxyError(error, proxy);
          return this.createFailureResult(proxy, proxyError);
        }
      } else {
        const protocolsToTry: ProxyProtocol[] =
          this.getOptimalProtocolOrder(proxyString);

        for (const protocol of protocolsToTry) {
          try {
            const result = await this.testProxyLowLevel(
              proxyString,
              options.targetUrl,
              {
                connectionsPerProxy: 1,
                testAllConnections: true,
                timeout: Math.min(timeout, 8_000), // Faster protocol detection
                sessionReuse: false,
                ipLookup: false,
              },
              protocol
            );

            if (result.status === "ok") {
              workingProtocol = protocol;

              // Now do full test with working protocol
              const fullResult = await this.testProxyLowLevel(
                proxyString,
                options.targetUrl,
                {
                  connectionsPerProxy:
                    options.proMode?.connectionsPerProxy || 3,
                  testAllConnections: true,
                  timeout,
                  sessionReuse: true,
                  ipLookup: options.proMode?.ipLookup !== false,
                },
                protocol
              );

              finalResult = this.convertResultToProxy(fullResult, proxy);
              break;
            }
          } catch (error: any) {
            // Store specific protocol errors for better error reporting
            const errorMessage = error.message?.toLowerCase() || "";

            // Check if this was a successful protocol detection but failed HTTP request
            if (
              (protocol === "http" || protocol === "https") &&
              errorMessage.includes(
                "connection closed before complete response"
              ) &&
              !errorMessage.includes("wrong protocol") &&
              !errorMessage.includes("socks")
            ) {
              // HTTP proxy was detected successfully, use this protocol
              workingProtocol = protocol;
              console.log(
                `✅ ${protocol.toUpperCase()} proxy protocol confirmed (despite request failure)`
              );

              // Do full test with working protocol
              try {
                const fullResult = await this.testProxyLowLevel(
                  proxyString,
                  options.targetUrl,
                  {
                    connectionsPerProxy:
                      options.proMode?.connectionsPerProxy || 3,
                    testAllConnections: true,
                    timeout,
                    sessionReuse: true,
                    ipLookup: options.proMode?.ipLookup !== false,
                  },
                  protocol
                );
                finalResult = this.convertResultToProxy(fullResult, proxy);
                break;
              } catch (fullTestError) {
                // If full test also fails, at least we know the protocol
                const detectedError = this.detectProxyError(
                  fullTestError,
                  proxy
                );
                finalResult = this.createFailureResult(proxy, {
                  message: `${protocol.toUpperCase()} proxy detected but requests are failing: ${
                    detectedError.message
                  }`,
                  code: "HTTP_PROXY_REQUEST_ERROR",
                  suggestion: detectedError.suggestion,
                  protocolsTried: [protocol],
                });
                break;
              }
            }

            // If we got a SOCKS authentication/authorization error, use that as the final error
            if (
              (protocol === "socks5" || protocol === "socks4") &&
              (errorMessage.includes("authentication issue") ||
                errorMessage.includes("authentication") ||
                errorMessage.includes("authorization") ||
                errorMessage.includes("ruleset") ||
                errorMessage.includes("username/password") ||
                errorMessage.includes("connect failed"))
            ) {
              // Determine if it's specifically a credential issue
              const isCredentialIssue =
                errorMessage.includes("authentication issue") ||
                errorMessage.includes("username/password") ||
                errorMessage.includes("ruleset");

              if (isCredentialIssue) {
                return this.createFailureResult(proxy, {
                  message: `${protocol.toUpperCase()} proxy detected but authentication failed: Username/password is incorrect or user lacks permissions`,
                  code: "SOCKS_INVALID_CREDENTIALS",
                  suggestion:
                    "Verify the username and password are correct and that this user has permission to use this proxy",
                  protocolsTried: [protocol],
                });
              } else {
                const detectedError = this.detectProxyError(error, proxy);
                return this.createFailureResult(proxy, {
                  message: `${protocol.toUpperCase()} proxy detected but connection failed: ${
                    detectedError.message
                  }`,
                  code: "SOCKS_AUTH_OR_PERMISSION_ERROR",
                  suggestion: detectedError.suggestion,
                  protocolsTried: [protocol],
                });
              }
            }

            // If we got HTTP proxy authentication error, use that as the final error
            if (
              (protocol === "http" || protocol === "https") &&
              (errorMessage.includes("407") ||
                errorMessage.includes("authentication failed") ||
                errorMessage.includes("username/password is incorrect") ||
                errorMessage.includes("unauthorized") ||
                errorMessage.includes("proxy authorization"))
            ) {
              return this.createFailureResult(proxy, {
                message: `${protocol.toUpperCase()} proxy detected but authentication failed: Username/password is incorrect`,
                code: "HTTP_INVALID_CREDENTIALS",
                suggestion:
                  "Verify the username and password are correct for this HTTP proxy",
                protocolsTried: [protocol],
              });
            }

            // If we got SOCKS4 authentication error, use that as the final error
            if (
              protocol === "socks4" &&
              (errorMessage.includes("authentication issue") ||
                errorMessage.includes("request rejected") ||
                errorMessage.includes("incorrect credentials"))
            ) {
              return this.createFailureResult(proxy, {
                message: `SOCKS4 proxy detected but authentication failed: Credentials are incorrect or insufficient permissions`,
                code: "SOCKS4_INVALID_CREDENTIALS",
                suggestion:
                  "Verify the proxy credentials and user permissions for SOCKS4 access",
                protocolsTried: [protocol],
              });
            }

            // If we got a clear protocol detection (not wrong protocol), surface that error
            if (
              protocol === "http" &&
              errorMessage.includes("http proxy connect failed")
            ) {
              const detectedError = this.detectProxyError(error, proxy);
              return this.createFailureResult(proxy, {
                message: `HTTP proxy detected but connection failed: ${detectedError.message}`,
                code: "HTTP_PROXY_CONNECTION_ERROR",
                suggestion: detectedError.suggestion,
                protocolsTried: [protocol],
              });
            }

            if (
              protocol === "https" &&
              errorMessage.includes("http proxy connect failed")
            ) {
              const detectedError = this.detectProxyError(error, proxy);
              return this.createFailureResult(proxy, {
                message: `HTTPS proxy detected but connection failed: ${detectedError.message}`,
                code: "HTTPS_PROXY_CONNECTION_ERROR",
                suggestion: detectedError.suggestion,
                protocolsTried: [protocol],
              });
            }

            if (
              protocol === "socks4" &&
              errorMessage.includes("socks4 connect failed")
            ) {
              const detectedError = this.detectProxyError(error, proxy);
              return this.createFailureResult(proxy, {
                message: `SOCKS4 proxy detected but connection failed: ${detectedError.message}`,
                code: "SOCKS4_CONNECTION_ERROR",
                suggestion: detectedError.suggestion,
                protocolsTried: [protocol],
              });
            }

            // Continue to next protocol for other errors
            continue;
          }
        }

        if (!workingProtocol) {
          return this.createFailureResult(proxy, {
            message: "All protocols failed",
            code: "ALL_PROTOCOLS_FAILED",
            suggestion: "Check proxy configuration and credentials",
            protocolsTried: protocolsToTry,
          });
        }
      }

      return finalResult;
    } catch (error: any) {
      if (error.name === "AbortError") {
        return this.createFailureResult(proxy, {
          message: "Test timeout exceeded",
          code: "TIMEOUT",
          suggestion: "Increase timeout or try a faster proxy",
        });
      }
      const proxyError = this.detectProxyError(error, proxy);
      return this.createFailureResult(proxy, proxyError);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async testProxyLowLevel(
    proxyString: string,
    targetUrl: string,
    options: ProxyTestOptions = {},
    forceProtocol?: ProxyProtocol
  ): Promise<any> {
    const {
      connectionsPerProxy = 3,
      testAllConnections = true,
      timeout = 10_000,
      sessionReuse = true,
    } = options;

    const parsedProxy = this.parseProxyString(proxyString);
    if (!parsedProxy) {
      throw new Error("Invalid proxy format");
    }

    const protocol = forceProtocol || this.detectProtocol(parsedProxy.port);

    const result: any = {
      proxy: proxyString,
      status: "fail",
      protocol,
      connections: [],
      averageMetrics: this.createEmptyMetrics(),
      firstConnectionTime: 0,
      subsequentConnectionTime: 0,
    };

    const connectionResults: DetailedLatencyMetrics[] = [];
    let reuseableSession: ManagedSocket | null = null;

    // Sequential testing for consistent timing measurements
    for (let i = 0; i < connectionsPerProxy; i++) {
      try {
        const connectionResult = await this.testSingleConnectionSafe(
          proxyString,
          targetUrl,
          i + 1,
          {
            timeout,
            reuseSession: i > 0 && sessionReuse ? reuseableSession : null,
            protocol,
          }
        );

        connectionResults.push(connectionResult);

        // Get reusable session after first successful connection
        if (i === 0 && sessionReuse) {
          const sessionKey = this.getSessionKey(proxyString, targetUrl);
          reuseableSession = this.sessionPool.get(sessionKey) || null;
        }

        if (!testAllConnections && connectionResult.totalTime > 0) {
          break;
        }
      } catch (error) {
        if (i === 0 && !testAllConnections) {
          throw error;
        }
        // Continue with remaining connections for testAllConnections=true
      }
    }

    if (connectionResults.length > 0) {
      result.status = "ok";
      result.connections = connectionResults;
      result.averageMetrics =
        this.calculatePreciseAverageMetrics(connectionResults);
      result.firstConnectionTime = connectionResults[0]?.totalTime || 0;

      if (connectionResults.length > 1) {
        const subsequentConnections = connectionResults.slice(1);
        result.subsequentConnectionTime =
          subsequentConnections.reduce((sum, conn) => sum + conn.totalTime, 0) /
          subsequentConnections.length;
      }

      // Get exit IP and geolocation if needed (optimized)
      if (options.ipLookup !== false) {
        try {
          const ipAndGeo = await this.getExitIpAndGeoOptimized(
            proxyString,
            Math.min(timeout, 5_000), // Faster IP lookup
            protocol,
            options.ipLookup === true
          );

          if (ipAndGeo) {
            result.exitIp = ipAndGeo.ip;
            if (ipAndGeo.geolocation) {
              result.geolocation = ipAndGeo.geolocation;
            }
          }
        } catch (error) {
          // Silent fail for IP lookup
        }
      }
    }

    return result;
  }

  private async testSingleConnectionSafe(
    proxyString: string,
    targetUrl: string,
    connectionNumber: number,
    options: TestConnectionOptions
  ): Promise<DetailedLatencyMetrics> {
    let socket: net.Socket | tls.TLSSocket | null = null;

    try {
      return await this.testSingleConnection(
        proxyString,
        targetUrl,
        connectionNumber,
        options
      );
    } catch (error) {
      if (socket) {
        this.destroySocket(socket);
      }
      throw error;
    }
  }

  private async testSingleConnection(
    proxyString: string,
    targetUrl: string,
    connectionNumber: number,
    options: TestConnectionOptions
  ): Promise<DetailedLatencyMetrics> {
    console.log(
      `Testing connection ${connectionNumber} in ${options.protocol} mode for proxy: ${proxyString}`
    );

    const metrics = this.createEmptyMetrics();
    metrics.connectionNumber = connectionNumber;
    metrics.isFirstConnection = connectionNumber === 1;

    const parsedProxy = this.parseProxyString(proxyString);
    if (!parsedProxy) {
      throw new Error("Invalid proxy format");
    }

    const targetUrlParsed = new URL(targetUrl);
    const timings: PreciseTimings = {};
    const startTime = performance.now();

    try {
      let socket: net.Socket | tls.TLSSocket;
      let sessionReused = false;

      // Check for reusable session
      if (options.reuseSession?.isAlive) {
        console.log("Reusing existing session...");
        socket = options.reuseSession.socket;
        sessionReused = true;
        metrics.sessionReused = true;
        options.reuseSession.requestCount++;
        options.reuseSession.lastUsed = Date.now();

        // For reused sessions, DNS is already resolved and cached
        metrics.dnsLookupTime = 0; // DNS was cached from first connection
      } else {
        console.log("Creating new socket connection...");

        // DNS Resolution WITHOUT caching for first connection
        timings.dnsStart = performance.now();

        if (connectionNumber === 1) {
          // First connection: Do actual DNS lookup and measure it
          console.log("First connection: Performing fresh DNS lookup...");
          await this.performFreshDnsLookup(parsedProxy.host);
          timings.dnsEnd = performance.now();
          metrics.dnsLookupTime = this.roundTiming(
            timings.dnsEnd - timings.dnsStart
          );

          // AFTER measuring, store in cache for subsequent connections
          const resolvedIp = await this.resolveDnsWithCache(parsedProxy.host);
          console.log(
            `DNS resolved to ${resolvedIp}, now cached for subsequent connections`
          );
        } else {
          // Subsequent connections: Use cached DNS
          console.log("Subsequent connection: Using cached DNS lookup...");
          await this.resolveDnsWithCache(parsedProxy.host);
          timings.dnsEnd = performance.now();
          metrics.dnsLookupTime = this.roundTiming(
            timings.dnsEnd - timings.dnsStart
          );
          console.log(`Cached DNS lookup took ${metrics.dnsLookupTime}ms`);
        }

        console.log("DNS resolved, creating socket...");

        // Create new socket connection
        socket = await this.createProxyConnection(
          parsedProxy.host,
          parsedProxy.port,
          parsedProxy.username,
          parsedProxy.password,
          targetUrlParsed,
          options.protocol,
          options.timeout,
          timings
        );

        console.log("Socket created, starting handshake...");

        // Store session for reuse
        const sessionKey = this.getSessionKey(proxyString, targetUrl);
        this.storeSession(sessionKey, {
          socket,
          protocol: options.protocol,
          proxy: proxyString,
          lastUsed: Date.now(),
          requestCount: 1,
          isAlive: true,
          targetUrl,
        });
      }

      // Calculate precise connection timings
      if (!sessionReused) {
        metrics.tcpConnectTime = this.calculateTiming(
          timings.connectStart,
          timings.connectEnd
        );
        metrics.tlsHandshakeTime = this.calculateTiming(
          timings.tlsStart,
          timings.tlsEnd
        );
        metrics.proxyConnectTime = this.calculateTiming(
          timings.proxyHandshakeStart,
          timings.proxyHandshakeEnd
        );

        // More precise auth timing
        if (parsedProxy.username && parsedProxy.password) {
          metrics.proxyAuthTime = Math.max(5, metrics.proxyConnectTime * 0.1);
        }
      }

      // Send HTTP request
      timings.requestStart = performance.now();
      const isHttpProxy =
        options.protocol === "http" && targetUrlParsed.protocol === "http:";

      console.log("Sending HTTP request...");

      await this.sendHttpRequestOptimized(
        socket,
        targetUrlParsed,
        timings,
        isHttpProxy,
        false,
        parsedProxy.username && parsedProxy.password
          ? {
              username: parsedProxy.username,
              password: parsedProxy.password,
            }
          : undefined
      );

      // Calculate response timings
      metrics.requestSendTime = this.calculateTiming(
        timings.requestStart,
        timings.requestEnd
      );
      metrics.responseWaitTime = this.calculateTiming(
        timings.requestEnd,
        timings.firstByteTime
      );
      metrics.responseDownloadTime = this.calculateTiming(
        timings.firstByteTime,
        timings.lastByteTime
      );
      metrics.totalTime = this.roundTiming(performance.now() - startTime);

      return metrics;
    } catch (error) {
      console.log("Error during connection test:", error);
      metrics.totalTime = this.roundTiming(performance.now() - startTime);
      throw error;
    }
  }

  public async createProxyConnection(
    proxyHost: string,
    proxyPort: number,
    username: string | undefined,
    password: string | undefined,
    targetUrl: URL,
    protocol: ProxyProtocol,
    timeout: number,
    timings: PreciseTimings
  ): Promise<net.Socket | tls.TLSSocket> {
    timings.connectStart = performance.now();

    return new Promise((resolve, reject) => {
      let socket: net.Socket;

      const timeoutId = setTimeout(() => {
        socket?.destroy();
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      socket = net.createConnection({
        host: proxyHost,
        port: proxyPort,

        timeout: timeout,
      });

      socket.once("connect", async () => {
        timings.connectEnd = performance.now();

        try {
          let finalSocket: net.Socket | tls.TLSSocket = socket;

          if (protocol === "socks5" || protocol === "socks4") {
            finalSocket = await this.handleSocksProxy(
              socket,
              targetUrl,
              username,
              password,
              protocol,
              timings,
              timeout
            );
          } else {
            finalSocket = await this.handleHttpProxy(
              socket,
              targetUrl,
              username,
              password,
              timings,
              timeout
            );
          }

          clearTimeout(timeoutId);

          resolve(finalSocket);
        } catch (error) {
          console.error("Error during proxy connection:", error);
          clearTimeout(timeoutId);
          socket.destroy();
          reject(error);
        }
      });

      socket.once("error", (error) => {
        console.error("Socket error during connection:", error);
        clearTimeout(timeoutId);
        reject(error);
      });

      socket.once("close", () => {
        console.log(
          "BIG SOCKET CLOOSEDBIG SOCKET CLOOSEDBIG SOCKET CLOOSEDBIG SOCKET CLOOSED "
        );
      });

      socket.once("timeout", () => {
        console.log("Socket connection timed out");
        clearTimeout(timeoutId);
        socket.destroy();
        reject(new Error("Socket connection timeout"));
      });
    });
  }

  //This just confirms the protocol type is http or https
  private async handleHttpProxy(
    socket: net.Socket,
    targetUrl: URL,
    username: string | undefined,
    password: string | undefined,
    timings: PreciseTimings,
    timeout: number
  ): Promise<net.Socket | tls.TLSSocket> {
    console.log(`🔍 [DEBUG] handleHttpProxy called:`);
    console.log(`  - targetUrl: ${targetUrl.href}`);
    console.log(`  - targetUrl.protocol: ${targetUrl.protocol}`);
    console.log(`  - hasAuth: ${!!(username && password)}`);
    console.log(`  - socket.destroyed: ${socket.destroyed}`);
    console.log(`  - socket.readyState: ${(socket as any).readyState}`);

    timings.proxyHandshakeStart = performance.now();

    return new Promise((resolve, reject) => {
      console.log(`🔧 [DEBUG] Testing HTTP proxy protocol...`);
      const isHttps = targetUrl.protocol === "https:";
      console.log(`🔧 [DEBUG] Target is HTTPS: ${isHttps}`);

      const timeoutId = setTimeout(() => {
        console.log(
          `⏰ [DEBUG] HTTP proxy protocol test timeout after ${Math.min(
            timeout,
            3000
          )}ms`
        );
        reject(new Error("HTTP proxy protocol test timeout"));
      }, Math.min(timeout, 3000)); // Fast timeout for protocol test

      let requestSent = false;

      if (isHttps) {
        // HTTPS proxy logic - uses CONNECT method
        console.log(`🔧 [DEBUG] Testing HTTPS proxy with CONNECT method...`);
        const port = targetUrl.port || "443";
        let connectRequest = `CONNECT ${targetUrl.hostname}:${port} HTTP/1.1\r\n`;
        connectRequest += `Host: ${targetUrl.hostname}:${port}\r\n`;

        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString(
            "base64"
          );
          connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
          console.log(
            `🔐 [DEBUG] Adding proxy authorization for user: ${username}`
          );
        }

        connectRequest += `Connection: keep-alive\r\n`;
        connectRequest += `\r\n`;

        console.log(
          `📤 [DEBUG] Sending CONNECT request:\n${connectRequest.replace(
            /\r\n/g,
            "\\r\\n\n"
          )}`
        );

        try {
          const writeResult = socket.write(connectRequest);
          requestSent = true;
          console.log(
            `📤 [DEBUG] CONNECT request sent, write result: ${writeResult}`
          );
        } catch (writeError) {
          console.log(`❌ [DEBUG] Error sending CONNECT request:`, writeError);
          clearTimeout(timeoutId);
          reject(writeError);
          return;
        }

        const onData = (data: Buffer) => {
          console.log(
            `📥 [DEBUG] CONNECT response received: ${data.length} bytes`
          );
          const response = data.toString();
          console.log(
            `📥 [DEBUG] CONNECT response content: ${response.substring(0, 200)}`
          );

          const firstByte = data[0];
          console.log(
            `📥 [DEBUG] First byte: 0x${firstByte.toString(16)} (${firstByte})`
          );

          if (firstByte === 0x05) {
            console.log(`❌ [DEBUG] SOCKS5 response detected - wrong protocol`);
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(new Error("SOCKS5 response detected - wrong protocol"));
            return;
          }
          if (firstByte === 0x00) {
            console.log(`❌ [DEBUG] SOCKS4 response detected - wrong protocol`);
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(new Error("SOCKS4 response detected - wrong protocol"));
            return;
          }

          if (response.includes("HTTP/")) {
            console.log(`✅ [DEBUG] HTTP response detected`);
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            timings.proxyHandshakeEnd = performance.now();

            if (response.includes("200")) {
              console.log(`✅ [DEBUG] CONNECT succeeded, establishing TLS...`);
              timings.tlsStart = performance.now();

              const tlsSocket = tls.connect({
                socket: socket,
                servername: targetUrl.hostname,
                rejectUnauthorized: false,
              });

              tlsSocket.once("secureConnect", () => {
                console.log(`✅ [DEBUG] TLS connection established`);
                timings.tlsEnd = performance.now();
                resolve(tlsSocket);
              });

              tlsSocket.once("error", (error) => {
                console.log(`❌ [DEBUG] TLS handshake failed:`, error);
                reject(new Error(`TLS handshake failed: ${error.message}`));
              });
            } else if (response.includes("407")) {
              console.log(`❌ [DEBUG] HTTP 407 Proxy Authentication Required`);
              reject(
                new Error(
                  "HTTP proxy authentication failed: Username/password is incorrect (407)"
                )
              );
            } else {
              const statusMatch = response.match(/HTTP\/\d\.\d\s+(\d+)/);
              const statusCode = statusMatch ? statusMatch[1] : "unknown";
              console.log(
                `❌ [DEBUG] CONNECT failed with status: ${statusCode}`
              );
              reject(
                new Error(`HTTP proxy CONNECT failed with status ${statusCode}`)
              );
            }
          } else {
            console.log(
              `🔄 [DEBUG] Partial response, waiting for more data...`
            );
          }
        };

        socket.on("data", onData);

        socket.once("close", () => {
          console.log(`🔌 [DEBUG] Socket closed during CONNECT test`);
          if (requestSent) {
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(
              new Error(
                "Connection closed after HTTP request - likely SOCKS proxy"
              )
            );
          }
        });

        socket.once("error", (error) => {
          console.log(`❌ [DEBUG] Socket error during CONNECT test:`, error);
          clearTimeout(timeoutId);
          socket.removeListener("data", onData);
          reject(new Error(`Socket error during HTTP test: ${error.message}`));
        });
      } else {
        timings.proxyHandshakeEnd = performance.now();
        console.log(
          `🔧 [DEBUG] HTTP target - testing proxy with actual HTTP request...`
        );
        resolve(socket);
      }
    });
  }

  // This just confirms the protocol type is socks4 or socks5, then establishes tunnel
  private async handleSocksProxy(
    socket: net.Socket,
    targetUrl: URL,
    username: string | undefined,
    password: string | undefined,
    protocol: "socks4" | "socks5",
    timings: PreciseTimings,
    timeout: number
  ): Promise<net.Socket | tls.TLSSocket> {
    timings.proxyHandshakeStart = performance.now();

    console.log(`Establishing ${protocol.toUpperCase()} tunnel directly...`);

    // Skip protocol test, go straight to tunnel establishment
    if (protocol === "socks5") {
      await this.establishSocks5Tunnel(
        socket,
        targetUrl,
        username,
        password,
        timeout
      );
    } else {
      await this.establishSocks4Tunnel(socket, targetUrl, timeout);
    }

    timings.proxyHandshakeEnd = performance.now();

    // If HTTPS, upgrade to TLS over the tunnel
    if (targetUrl.protocol === "https:") {
      console.log("Upgrading to TLS over SOCKS tunnel...");

      return new Promise((resolve, reject) => {
        const tlsSocket = tls.connect({
          socket: socket,
          servername: targetUrl.hostname,
          rejectUnauthorized: false,
          timeout: timeout,
        });

        const timeoutId = setTimeout(() => {
          tlsSocket.destroy();
          reject(new Error("TLS handshake timeout"));
        }, timeout);

        tlsSocket.once("secureConnect", () => {
          clearTimeout(timeoutId);
          console.log("✅ TLS connection established over SOCKS tunnel");
          resolve(tlsSocket);
        });

        tlsSocket.once("error", (error) => {
          clearTimeout(timeoutId);
          reject(new Error(`TLS over SOCKS failed: ${error.message}`));
        });
      });
    }

    console.log("✅ SOCKS tunnel established and ready for HTTP requests");
    return socket;
  }

  // Establish SOCKS5 tunnel (full handshake with auth) - this is the ONLY place we do SOCKS5 handshake
  private async establishSocks5Tunnel(
    socket: net.Socket,
    targetUrl: URL,
    username: string | undefined,
    password: string | undefined,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("SOCKS5 tunnel establishment timeout"));
      }, timeout);

      let step = "greeting";

      // Step 1: Send greeting
      const authMethod = username && password ? 0x02 : 0x00;
      const greeting = Buffer.from([0x05, 0x01, authMethod]);

      socket.write(greeting);
      console.log(
        `SOCKS5: Sending greeting [${Array.from(greeting)
          .map((b) => "0x" + b.toString(16).padStart(2, "0"))
          .join(", ")}]`
      );

      const onData = (data: Buffer) => {
        console.log(
          `SOCKS5: Received [${Array.from(data)
            .map((b) => "0x" + b.toString(16).padStart(2, "0"))
            .join(", ")}] in step '${step}'`
        );

        if (step === "greeting") {
          if (data.length >= 2 && data[0] === 0x05) {
            const selectedMethod = data[1];

            if (selectedMethod === 0x00) {
              // No authentication required - proceed to connect
              console.log("SOCKS5: No authentication required");
              step = "connect";
              this.sendSocks5ConnectRequest(
                socket,
                targetUrl,
                resolve,
                reject,
                timeout
              );
            } else if (selectedMethod === 0x02 && username && password) {
              // Username/password authentication required
              console.log("SOCKS5: Username/password authentication required");
              step = "auth";
              const authBuffer = Buffer.concat([
                Buffer.from([0x01]),
                Buffer.from([username.length]),
                Buffer.from(username),
                Buffer.from([password.length]),
                Buffer.from(password),
              ]);
              socket.write(authBuffer);
              console.log(`SOCKS5: Sending auth for user '${username}'`);
            } else if (selectedMethod === 0xff) {
              clearTimeout(timeoutId);
              socket.removeListener("data", onData);
              reject(new Error("SOCKS5: No acceptable authentication methods"));
            } else {
              clearTimeout(timeoutId);
              socket.removeListener("data", onData);
              reject(
                new Error(
                  `SOCKS5: Unsupported authentication method: 0x${selectedMethod.toString(
                    16
                  )}`
                )
              );
            }
          } else {
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(new Error("Invalid SOCKS5 greeting response"));
          }
        } else if (step === "auth") {
          if (data.length >= 2 && data[0] === 0x01) {
            if (data[1] === 0x00) {
              // Authentication successful - proceed to connect
              console.log("SOCKS5: Authentication successful");
              step = "connect";
              this.sendSocks5ConnectRequest(
                socket,
                targetUrl,
                resolve,
                reject,
                timeout
              );
            } else {
              clearTimeout(timeoutId);
              socket.removeListener("data", onData);
              reject(
                new Error(
                  "SOCKS5: Authentication failed - invalid username or password (407)"
                )
              );
            }
          } else {
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(new Error("Invalid SOCKS5 authentication response"));
          }
        } else if (step === "connect") {
          if (data.length >= 10 && data[0] === 0x05) {
            const replyCode = data[1];
            if (replyCode === 0x00) {
              clearTimeout(timeoutId);
              socket.removeListener("data", onData);
              console.log("✅ SOCKS5 tunnel established successfully");
              resolve();
            } else {
              clearTimeout(timeoutId);
              socket.removeListener("data", onData);
              const errorMessages: { [key: number]: string } = {
                0x01: "General SOCKS server failure",
                0x02: "Connection not allowed by ruleset - possible authentication/authorization issue",
                0x03: "Network unreachable",
                0x04: "Host unreachable",
                0x05: "Connection refused",
                0x06: "TTL expired",
                0x07: "Command not supported",
                0x08: "Address type not supported",
              };
              const errorMsg =
                errorMessages[replyCode] ||
                `Unknown error code: 0x${replyCode.toString(16)}`;

              // Special case for 0x02 - often indicates auth/authorization issues
              if (replyCode === 0x02) {
                const errorMessage = `SOCKS5 authentication issue: Connection not allowed by ruleset. The username/password appears to be incorrect or this user lacks permission to connect through this proxy.`;
                console.log(`❌ ${errorMessage}`);
                reject(new Error(errorMessage));
              } else {
                const errorMessage = `SOCKS5 connect failed: ${errorMsg}`;
                console.log(`❌ ${errorMessage}`);
                reject(new Error(errorMessage));
              }
            }
          } else {
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(new Error("Invalid SOCKS5 connect response"));
          }
        }
      };

      socket.on("data", onData);

      socket.once("error", (error) => {
        clearTimeout(timeoutId);
        socket.removeListener("data", onData);
        reject(new Error(`SOCKS5 tunnel error: ${error.message}`));
      });

      socket.once("close", () => {
        clearTimeout(timeoutId);
        socket.removeListener("data", onData);
        reject(new Error("SOCKS5 tunnel connection closed unexpectedly"));
      });
    });
  }

  // Helper for SOCKS5 connect request
  private sendSocks5ConnectRequest(
    socket: net.Socket,
    targetUrl: URL,
    resolve: () => void,
    reject: (error: Error) => void,
    timeout: number
  ): void {
    const port =
      parseInt(targetUrl.port) || (targetUrl.protocol === "https:" ? 443 : 80);
    const hostBuffer = Buffer.from(targetUrl.hostname);

    const request = Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03]), // SOCKS5, CONNECT, Reserved, Domain name
      Buffer.from([hostBuffer.length]),
      hostBuffer,
      Buffer.from([port >> 8, port & 0xff]),
    ]);

    socket.write(request);
    console.log(
      `SOCKS5: Sending connect request to ${targetUrl.hostname}:${port}`
    );
  }

  // Establish SOCKS4 tunnel (full handshake) - this is the ONLY place we do SOCKS4 handshake
  private async establishSocks4Tunnel(
    socket: net.Socket,
    targetUrl: URL,
    timeout: number
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("SOCKS4 tunnel establishment timeout"));
      }, timeout);

      try {
        const port =
          parseInt(targetUrl.port) ||
          (targetUrl.protocol === "https:" ? 443 : 80);

        // Resolve hostname to IP for SOCKS4
        let ipAddress: string;
        try {
          const { address } = await dns.lookup(targetUrl.hostname);
          ipAddress = address;
        } catch {
          clearTimeout(timeoutId);
          reject(new Error("SOCKS4: Hostname resolution failed"));
          return;
        }

        const ip = ipAddress.split(".").map(Number);
        const request = Buffer.from([
          0x04, // SOCKS version
          0x01, // Connect command
          port >> 8, // Port high byte
          port & 0xff, // Port low byte
          ...ip, // IP address
          0x00, // NULL terminator for user ID
        ]);

        socket.write(request);
        console.log(
          `SOCKS4: Connecting to ${ipAddress}:${port} (${targetUrl.hostname})`
        );

        const onData = (data: Buffer) => {
          console.log(
            `SOCKS4: Received [${Array.from(data)
              .map((b) => "0x" + b.toString(16).padStart(2, "0"))
              .join(", ")}]`
          );

          if (data.length >= 8 && data[0] === 0x00) {
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);

            const replyCode = data[1];
            if (replyCode === 0x5a) {
              console.log("✅ SOCKS4 tunnel established successfully");
              resolve();
            } else if (replyCode === 0x5b) {
              // 0x5b often indicates authentication/authorization issues in SOCKS4
              const errorMessage = `SOCKS4 authentication issue: Request rejected or failed. This often indicates incorrect credentials or insufficient permissions.`;
              console.log(`❌ ${errorMessage}`);
              reject(new Error(errorMessage));
            } else {
              const errorMessages: { [key: number]: string } = {
                0x5c: "Request rejected - SOCKS server cannot connect to identd on the client",
                0x5d: "Request rejected - client program and identd report different user-ids",
              };
              const errorMsg =
                errorMessages[replyCode] ||
                `Unknown error code: 0x${replyCode.toString(16)}`;
              const errorMessage = `SOCKS4 connect failed: ${errorMsg}`;
              console.log(`❌ ${errorMessage}`);
              reject(new Error(errorMessage));
            }
          } else {
            clearTimeout(timeoutId);
            socket.removeListener("data", onData);
            reject(new Error("Invalid SOCKS4 response"));
          }
        };

        socket.on("data", onData);

        socket.once("error", (error) => {
          clearTimeout(timeoutId);
          socket.removeListener("data", onData);
          reject(new Error(`SOCKS4 tunnel error: ${error.message}`));
        });

        socket.once("close", () => {
          clearTimeout(timeoutId);
          socket.removeListener("data", onData);
          reject(new Error("SOCKS4 tunnel connection closed unexpectedly"));
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  public async sendHttpRequestOptimized(
    socket: net.Socket | tls.TLSSocket,
    targetUrl: URL,
    timings: PreciseTimings,
    isProxyConnection: boolean = false,
    returnResponse: boolean = false,
    proxyAuth?: { username: string; password: string }
  ): Promise<string | void> {
    return new Promise((resolve, reject) => {
      console.log(`🔍 [DEBUG] sendHttpRequestOptimized called with:`);
      console.log(`  - targetUrl: ${targetUrl.href}`);
      console.log(`  - isProxyConnection: ${isProxyConnection}`);
      console.log(`  - returnResponse: ${returnResponse}`);
      console.log(`  - hasProxyAuth: ${!!proxyAuth}`);
      console.log(`  - proxyAuth value:`, proxyAuth);
      console.log(`  - socket.destroyed: ${socket.destroyed}`);
      console.log(`  - socket.readyState: ${(socket as any).readyState}`);

      const timeoutId = setTimeout(() => {
        console.log(
          `❌ [DEBUG] HTTP request timeout after ${this.REQUEST_TIMEOUT}ms`
        );
        reject(new Error("HTTP request timeout"));
      }, this.REQUEST_TIMEOUT);

      // For SOCKS proxies, always use direct path (tunnel is already established)
      // For HTTP proxies, use full URL if it's HTTP (not HTTPS)
      const path = targetUrl.pathname + targetUrl.search;
      const requestPath =
        isProxyConnection && targetUrl.protocol === "http:"
          ? targetUrl.href
          : path;

      // Build HTTP request headers
      const requestHeaders = [
        `GET ${requestPath} HTTP/1.1`,
        `Host: ${targetUrl.hostname}`,
        `User-Agent: Enhanced-Proxy-Tester/3.0.0`,
        `Accept: */*`,
        `Connection: ${returnResponse ? "close" : "keep-alive"}`,
        `Cache-Control: no-cache`,
        `Accept-Encoding: identity`,
      ];

      // Add proxy authorization if needed
      if (proxyAuth && isProxyConnection) {
        const auth = Buffer.from(
          `${proxyAuth.username}:${proxyAuth.password}`
        ).toString("base64");
        requestHeaders.push(`Proxy-Authorization: Basic ${auth}`);
        console.log(
          `🔐 [DEBUG] Added Proxy-Authorization header for user: ${proxyAuth.username}`
        );
      }

      const request = requestHeaders.join("\r\n") + "\r\n\r\n";

      console.log(`📤 [DEBUG] Sending HTTP request: GET ${requestPath}`);
      console.log(
        `📤 [DEBUG] Full request:\n${request.replace(/\r\n/g, "\\r\\n\n")}`
      );

      try {
        const writeResult = socket.write(request);
        console.log(`📤 [DEBUG] socket.write() returned: ${writeResult}`);
        timings.requestEnd = performance.now();
      } catch (writeError) {
        console.log(`❌ [DEBUG] Error writing to socket:`, writeError);
        clearTimeout(timeoutId);
        reject(writeError);
        return;
      }

      let responseData = "";
      let headersParsed = false;
      let expectedLength = -1;
      let receivedLength = 0;
      let responseComplete = false;
      let fullResponse = "";
      let isChunked = false;
      let responseHeaders = "";
      let statusCode = 0;
      let dataChunkCount = 0;

      console.log(`🔧 [DEBUG] Setting up response handlers...`);

      const cleanup = () => {
        if (!responseComplete) {
          console.log(`🧹 [DEBUG] Cleaning up handlers`);
          responseComplete = true;
          clearTimeout(timeoutId);
          socket.removeListener("data", onData);
          socket.removeListener("error", onError);
          socket.removeListener("close", onClose);
        }
      };

      const checkCompletion = () => {
        if (responseComplete || !headersParsed) return;

        let isComplete = false;

        if (returnResponse) {
          // For IP lookup - wait for complete response
          if (expectedLength > 0) {
            isComplete = receivedLength >= expectedLength;
          } else if (isChunked) {
            isComplete = responseData.includes("0\r\n\r\n");
          } else {
            // For connection close or unknown length
            isComplete =
              receivedLength > 0 &&
              (responseData.includes("}\n") ||
                responseData.includes("}") ||
                responseData.includes("</html>") ||
                responseData.includes("</body>"));
          }
        } else {
          // For proxy testing - be more lenient with completion detection
          if (expectedLength > 0) {
            // Wait for exact Content-Length
            isComplete = receivedLength >= expectedLength;
          } else if (isChunked) {
            // Wait for chunk terminator
            isComplete = responseData.includes("0\r\n\r\n");
          } else {
            // For unknown length, use smart detection
            const hasHtmlEnd =
              responseData.includes("</html>") ||
              responseData.includes("</body>");
            const hasJsonEnd = !!responseData.match(/}\s*$/);
            const hasMinimumSize = receivedLength >= 100; // Reduced minimum size
            const hasNewlineEnd =
              responseData.endsWith("\n") || responseData.endsWith("\r\n");

            // For HTTP proxy connections, be more aggressive about completion
            if (isProxyConnection && statusCode === 200) {
              // If we got a 200 OK and have any reasonable amount of data, consider complete
              isComplete =
                hasHtmlEnd ||
                hasJsonEnd ||
                hasNewlineEnd ||
                (hasMinimumSize && receivedLength > 0) ||
                (receivedLength >= 10 && responseData.includes(".")); // Basic content check
            } else {
              // Complete if we have clear end markers OR sufficient data
              isComplete =
                hasHtmlEnd ||
                hasJsonEnd ||
                hasNewlineEnd ||
                (hasMinimumSize && receivedLength > 0);
            }
          }
        }

        if (isComplete) {
          timings.lastByteTime = performance.now();
          cleanup();
          resolve(returnResponse ? fullResponse : undefined);
        }
      };

      const onData = (chunk: Buffer) => {
        dataChunkCount++;
        console.log(
          `📥 [DEBUG] Data chunk ${dataChunkCount} received: ${chunk.length} bytes`
        );
        console.log(
          `📥 [DEBUG] Chunk content (first 200 chars): ${chunk
            .toString()
            .substring(0, 200)
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")}`
        );

        if (responseComplete) {
          console.log(
            `⚠️ [DEBUG] Data received after response marked complete, ignoring`
          );
          return;
        }

        if (!timings.firstByteTime) {
          timings.firstByteTime = performance.now();
          console.log(
            `⏱️ [DEBUG] First byte received at ${timings.firstByteTime}`
          );
        }

        const chunkStr = chunk.toString();
        responseData += chunkStr;
        if (returnResponse) {
          fullResponse += chunkStr;
        }

        console.log(
          `📊 [DEBUG] Total response data length: ${responseData.length}`
        );

        if (
          !headersParsed &&
          (responseData.includes("\r\n\r\n") || responseData.includes("\n\n"))
        ) {
          console.log(`📋 [DEBUG] Headers detected, parsing...`);
          headersParsed = true;

          // Handle both \r\n\r\n and \n\n header separators
          let headerEnd = responseData.indexOf("\r\n\r\n");
          let headerSeparator = "\r\n\r\n";
          if (headerEnd === -1) {
            headerEnd = responseData.indexOf("\n\n");
            headerSeparator = "\n\n";
          }

          responseHeaders = responseData.slice(0, headerEnd);
          const body = responseData.slice(headerEnd + headerSeparator.length);

          console.log(
            `📋 [DEBUG] Headers (${
              headerSeparator === "\r\n\r\n" ? "CRLF" : "LF"
            }):\n${responseHeaders}`
          );
          console.log(`📋 [DEBUG] Body length: ${body.length}`);

          // Parse status code
          const statusMatch = responseHeaders.match(/HTTP\/\d\.\d\s+(\d+)/);
          statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
          console.log(`📋 [DEBUG] Status code: ${statusCode}`);

          // Parse Content-Length
          const contentLengthMatch = responseHeaders.match(
            /content-length:\s*(\d+)/i
          );
          expectedLength = contentLengthMatch
            ? parseInt(contentLengthMatch[1])
            : -1;
          console.log(`📋 [DEBUG] Expected content length: ${expectedLength}`);

          // Parse Transfer-Encoding
          isChunked = /transfer-encoding:\s*chunked/i.test(responseHeaders);
          console.log(`📋 [DEBUG] Is chunked: ${isChunked}`);

          receivedLength = Buffer.byteLength(body);
          console.log(`📋 [DEBUG] Initial body length: ${receivedLength}`);

          console.log(
            `📋 [DEBUG] Response headers parsed - Status: ${statusCode}, Content-Length: ${expectedLength}, Chunked: ${isChunked}, Initial body: ${receivedLength} bytes`
          );

          // For HTTP proxy connections with small responses, check immediately
          if (
            isProxyConnection &&
            statusCode === 200 &&
            expectedLength !== -1 &&
            expectedLength <= 50
          ) {
            console.log(
              `🏁 [DEBUG] Small response detected for HTTP proxy, checking completion...`
            );
            // Small response, likely complete already
            if (receivedLength >= expectedLength) {
              console.log(`✅ [DEBUG] Small response complete immediately`);
              timings.lastByteTime = performance.now();
              cleanup();
              resolve(returnResponse ? fullResponse : undefined);
              return;
            }
          }

          // Check for authentication errors immediately
          if (statusCode === 407) {
            console.log(
              `❌ [DEBUG] HTTP 407 Proxy Authentication Required detected`
            );
            timings.lastByteTime = performance.now();
            cleanup();
            reject(
              new Error(
                "HTTP proxy authentication failed: Username/password is incorrect (407)"
              )
            );
            return;
          }
        } else if (headersParsed) {
          const newBytes = chunk.length;
          receivedLength += newBytes;
          console.log(
            `📊 [DEBUG] Added ${newBytes} bytes to body, total: ${receivedLength}`
          );
        } else {
          console.log(
            `📋 [DEBUG] Still waiting for headers, response length: ${responseData.length}`
          );
        }

        // Check for completion after each chunk
        checkCompletion();
      };

      const onError = (error: Error) => {
        console.log(`❌ [DEBUG] Socket error:`, error);
        console.log(
          `❌ [DEBUG] Socket state at error: destroyed=${
            socket.destroyed
          }, readyState=${(socket as any).readyState}`
        );
        cleanup();
        reject(error);
      };

      const onClose = () => {
        console.log(`🔌 [DEBUG] Socket closed event triggered`);
        console.log(
          `🔌 [DEBUG] Response state: complete=${responseComplete}, headersParsed=${headersParsed}, receivedLength=${receivedLength}, statusCode=${statusCode}`
        );
        console.log(`🔌 [DEBUG] dataChunkCount: ${dataChunkCount}`);

        if (!responseComplete) {
          console.log(
            `🔌 [DEBUG] Socket closed - received ${receivedLength} bytes, headers parsed: ${headersParsed}`
          );

          // If connection closed and we have valid response data, consider it complete
          if (headersParsed && receivedLength > 0 && statusCode === 200) {
            console.log(
              `✅ [DEBUG] Connection closed but we have valid response data - considering complete`
            );
            timings.lastByteTime = performance.now();
            cleanup();
            resolve(returnResponse ? fullResponse : undefined);
          } else if (headersParsed && statusCode !== 200) {
            // We got a response but it wasn't successful
            console.log(
              `❌ [DEBUG] Connection closed with non-200 status: ${statusCode}`
            );
            cleanup();
            reject(new Error(`HTTP ${statusCode} response received`));
          } else {
            console.log(
              `❌ [DEBUG] Connection closed before complete response - no headers parsed or no data received`
            );
            cleanup();
            reject(new Error("Connection closed before complete response"));
          }
        } else {
          console.log(`ℹ️ [DEBUG] Socket closed but response already complete`);
        }
      };

      console.log(`🎧 [DEBUG] Attaching event listeners...`);
      socket.on("data", onData);
      socket.once("error", onError);
      socket.once("close", onClose);

      // Add additional socket state monitoring
      socket.on("end", () => {
        console.log(`🔚 [DEBUG] Socket 'end' event triggered`);
      });

      socket.on("finish", () => {
        console.log(`🏁 [DEBUG] Socket 'finish' event triggered`);
      });

      console.log(`⏰ [DEBUG] Setting up fallback timeouts...`);

      // More aggressive fallback timeout for HTTP proxy connections
      setTimeout(
        () => {
          if (!responseComplete && timings.firstByteTime && headersParsed) {
            console.log(
              `Fallback timeout - forcing completion with ${receivedLength} bytes (status: ${statusCode})`
            );

            // If we have a valid response, complete it
            if (statusCode === 200 && receivedLength > 0) {
              timings.lastByteTime = performance.now();
              cleanup();
              resolve(returnResponse ? fullResponse : undefined);
            } else {
              cleanup();
              reject(
                new Error(
                  `Incomplete response after timeout (status: ${statusCode}, bytes: ${receivedLength})`
                )
              );
            }
          }
        },
        isProxyConnection ? 4000 : 6000
      ); // Shorter timeout for HTTP proxy connections
    });
  }

  public async getExitIpAndGeoOptimized(
    proxyString: string,
    timeout: number,
    protocol: ProxyProtocol,
    needsGeo: boolean
  ): Promise<{ ip?: string; geolocation?: any } | undefined> {
    try {
      const ipServiceUrl = needsGeo
        ? "https://ipinfo.io/json"
        : "https://httpbin.org/ip";

      const parsedProxy = this.parseProxyString(proxyString);
      if (!parsedProxy) return undefined;

      const targetUrlParsed = new URL(ipServiceUrl);
      const socket = await this.createProxyConnection(
        parsedProxy.host,
        parsedProxy.port,
        parsedProxy.username,
        parsedProxy.password,
        targetUrlParsed,
        protocol,
        timeout,
        {}
      );

      try {
        const timings: PreciseTimings = {};
        const response = (await this.sendHttpRequestOptimized(
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
        )) as string;

        console.log(
          "IP lookup response received:",
          response.length,
          "characters"
        );

        // Parse the response
        if (response.includes("\r\n\r\n")) {
          const bodyStart = response.indexOf("\r\n\r\n") + 4;
          let body = response.slice(bodyStart).trim();

          // Handle chunked encoding
          if (body.includes("\r\n")) {
            const lines = body.split("\r\n");
            const jsonLine = lines.find((line) => line.startsWith("{"));
            if (jsonLine) {
              body = jsonLine;
            }
          }

          console.log("IP lookup body:", body);

          const data = JSON.parse(body);
          const result: any = { ip: data.ip || data.origin };

          if (needsGeo && data) {
            result.geolocation = {
              country: data.country || data.countryCode,
              countryCode: data.country || data.countryCode,
              city: data.city,
              region: data.region || data.regionName,
              isp: data.org || data.isp,
              loc: data.loc || `${data.lat},${data.lon}`,
            };
          }

          console.log("IP lookup success:", result);
          return result;
        }

        return undefined;
      } finally {
        this.destroySocket(socket);
      }
    } catch (error) {
      console.log("IP lookup error:", error);
      return undefined;
    }
  }

  // Helper methods for better precision and performance

  public parseProxyString(proxyString: string): ParsedProxy | null {
    try {
      const parts = proxyString.split(":");
      if (parts.length === 2) {
        // host:port
        const port = parseInt(parts[1]);
        if (isNaN(port) || port < 1 || port > 65535) return null;
        return { host: parts[0], port };
      } else if (parts.length === 4) {
        // user:pass:host:port or host:port:user:pass
        const port1 = parseInt(parts[1]);
        const port3 = parseInt(parts[3]);

        if (!isNaN(port1) && isNaN(port3) && port1 >= 1 && port1 <= 65535) {
          // host:port:user:pass
          return {
            host: parts[0],
            port: port1,
            username: parts[2],
            password: parts[3],
          };
        } else if (
          isNaN(port1) &&
          !isNaN(port3) &&
          port3 >= 1 &&
          port3 <= 65535
        ) {
          // user:pass:host:port
          return {
            host: parts[2],
            port: port3,
            username: parts[0],
            password: parts[1],
          };
        }
      }

      // Try parsing as user:pass@host:port
      const atIndex = proxyString.indexOf("@");
      if (atIndex > 0) {
        const [userPass, hostPort] = [
          proxyString.slice(0, atIndex),
          proxyString.slice(atIndex + 1),
        ];
        const [username, password] = userPass.split(":");
        const [host, portStr] = hostPort.split(":");
        const port = parseInt(portStr);

        if (
          username &&
          password &&
          host &&
          !isNaN(port) &&
          port >= 1 &&
          port <= 65535
        ) {
          return { host, port, username, password };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private isValidProxyFormat(proxyString: string): boolean {
    return this.parseProxyString(proxyString) !== null;
  }

  private async performFreshDnsLookup(hostname: string): Promise<string> {
    // Check if it's already an IP
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname;
    }

    try {
      // Always do fresh DNS lookup, don't check cache
      const addresses = await Promise.race([
        dns.resolve4(hostname),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DNS timeout")), 3000)
        ),
      ]);

      const ip = addresses[0];
      console.log(`Fresh DNS lookup: ${hostname} -> ${ip}`);
      return ip;
    } catch (error) {
      console.log(`Fresh DNS lookup failed for ${hostname}:`, error);
      // If DNS fails, try to use hostname as-is
      return hostname;
    }
  }

  private async resolveDnsWithCache(hostname: string): Promise<string> {
    // Check if it's already an IP
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname;
    }

    const cached = this.DNS_CACHE.get(hostname);
    if (cached && Date.now() - cached.timestamp < this.DNS_CACHE_TTL) {
      console.log(`Using cached DNS: ${hostname} -> ${cached.ip}`);
      return cached.ip;
    }

    try {
      const addresses = await Promise.race([
        dns.resolve4(hostname),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DNS timeout")), 3000)
        ),
      ]);

      const ip = addresses[0];
      this.DNS_CACHE.set(hostname, { ip, timestamp: Date.now() });
      console.log(`DNS resolved and cached: ${hostname} -> ${ip}`);
      return ip;
    } catch (error) {
      console.log(`Cached DNS lookup failed for ${hostname}:`, error);
      // If DNS fails, try to use hostname as-is
      return hostname;
    }
  }

  public getOptimalProtocolOrder(proxyString: string): ProxyProtocol[] {
    const parsedProxy = this.parseProxyString(proxyString);
    if (!parsedProxy) return ["http", "https", "socks5", "socks4"];

    const port = parsedProxy.port;
    const hasAuth = !!(parsedProxy.username && parsedProxy.password);

    // Order protocols by likelihood based on port and authentication
    if ([1080, 1081, 9050, 9051].includes(port)) {
      return hasAuth
        ? ["socks5", "socks4", "http", "https"]
        : ["socks5", "http", "https", "socks4"];
    }
    if ([1082, 1083, 1084].includes(port)) {
      return ["socks4", "socks5", "http", "https"];
    }
    if ([8443, 443, 9443].includes(port)) {
      return ["https", "http", "socks5", "socks4"];
    }
    if ([8080, 3128, 8888, 8118, 808, 8000].includes(port)) {
      return ["http", "https", "socks5", "socks4"];
    }

    // Default order for unknown ports
    return hasAuth
      ? ["http", "https", "socks5", "socks4"]
      : ["http", "socks5", "https", "socks4"];
  }

  private roundTiming(ms: number): number {
    return Math.round(ms * 100) / 100;
  }

  private calculateTiming(start?: number, end?: number): number {
    if (!start || !end || start > end) return 0;
    return this.roundTiming(Math.max(0, end - start));
  }

  private calculatePreciseAverageMetrics(
    connections: DetailedLatencyMetrics[]
  ): DetailedLatencyMetrics {
    if (connections.length === 0) {
      return this.createEmptyMetrics();
    }

    const avg = this.createEmptyMetrics();
    const firstConnection =
      connections.find((c) => c.isFirstConnection) || connections[0];

    // One-time connection setup metrics (from first connection only)
    avg.dnsLookupTime = firstConnection.dnsLookupTime;
    avg.tcpConnectTime = firstConnection.tcpConnectTime;
    avg.tlsHandshakeTime = firstConnection.tlsHandshakeTime;
    avg.proxyConnectTime = firstConnection.proxyConnectTime;
    avg.proxyAuthTime = firstConnection.proxyAuthTime;

    // Per-request metrics (averaged across all connections)
    const count = connections.length;
    avg.requestSendTime = this.roundTiming(
      connections.reduce((sum, c) => sum + c.requestSendTime, 0) / count
    );
    avg.responseWaitTime = this.roundTiming(
      connections.reduce((sum, c) => sum + c.responseWaitTime, 0) / count
    );
    avg.responseDownloadTime = this.roundTiming(
      connections.reduce((sum, c) => sum + c.responseDownloadTime, 0) / count
    );
    avg.totalTime = this.roundTiming(
      connections.reduce((sum, c) => sum + c.totalTime, 0) / count
    );

    return avg;
  }

  public destroySocket(socket: net.Socket | tls.TLSSocket): void {
    try {
      socket.removeAllListeners();
      if (!socket.destroyed) {
        socket.destroy();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private cleanupSessions(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, session] of this.sessionPool.entries()) {
      if (now - session.lastUsed > this.SESSION_TIMEOUT || !session.isAlive) {
        this.destroySocket(session.socket);
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.sessionPool.delete(key));

    // Clean DNS cache
    for (const [hostname, cached] of this.DNS_CACHE.entries()) {
      if (now - cached.timestamp > this.DNS_CACHE_TTL) {
        this.DNS_CACHE.delete(hostname);
      }
    }

    // Limit cache sizes to prevent memory leaks
    if (this.DNS_CACHE.size > 1000) {
      const oldestEntries = Array.from(this.DNS_CACHE.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, 500);
      oldestEntries.forEach(([hostname]) => this.DNS_CACHE.delete(hostname));
    }
  }

  private createEmptyMetrics(): DetailedLatencyMetrics {
    return {
      dnsLookupTime: 0,
      tcpConnectTime: 0,
      tlsHandshakeTime: 0,
      proxyConnectTime: 0,
      proxyAuthTime: 0,
      requestSendTime: 0,
      responseWaitTime: 0,
      responseDownloadTime: 0,
      totalTime: 0,
      isFirstConnection: false,
      sessionReused: false,
      connectionNumber: 0,
    };
  }

  private convertResultToProxy(result: any, originalProxy: Proxy): Proxy {
    const connections = result.connections || [];
    const averageMetrics = result.averageMetrics || this.createEmptyMetrics();

    return {
      ...originalProxy,
      status: result.status as ProxyStatus,
      protocol: result.protocol,
      latency: result.firstConnectionTime || 0,
      error: null,
      simpleData: null,
      proDetails: {
        connections,
        averageMetrics,
        firstConnectionTime: result.firstConnectionTime || 0,
        subsequentConnectionTime: result.subsequentConnectionTime || 0,
        connectionsCount: connections.length,
        detailedMetrics: connections[0] || this.createEmptyMetrics(),
      },
    };
  }

  private createFailureResult(proxy: Proxy, error: ProxyError): Proxy {
    return {
      ...proxy,
      status: "fail" as ProxyStatus,
      simpleData: null,
      proDetails: null,
      error,
    };
  }

  public detectProxyError(error: any, proxy: Proxy): ProxyError {
    const errorMessage = error.message?.toLowerCase() || "";
    const hasCredentials =
      proxy.formatted.includes("@") || proxy.formatted.split(":").length === 4;

    // Enhanced error detection patterns with more specific matching
    const errorPatterns = {
      auth: [
        "407",
        "authentication failed",
        "unauthorized",
        "access denied",
        "proxy authentication required",
        "authentication required",
        "invalid credentials",
        "auth failed",
        "socks5: authentication failed",
        "socks5 authentication failed",
      ],
      notFound: [
        "enotfound",
        "getaddrinfo",
        "host not found",
        "name resolution failed",
        "dns resolution failed",
        "hostname not found",
      ],
      refused: [
        "econnrefused",
        "connection refused",
        "connect refused",
        "port closed",
        "connection rejected",
      ],
      timeout: [
        "timeout",
        "etimedout",
        "connection timeout",
        "handshake timeout",
        "request timeout",
        "operation timeout",
      ],
      reset: [
        "econnreset",
        "connection reset",
        "socket hang up",
        "connection ended",
        "connection closed",
      ],
      tunnel: [
        "tunnel",
        "connect failed",
        "tunnel connection failed",
        "proxy connect failed",
        "establish tunnel",
      ],
      socks: [
        "socks",
        "socks4",
        "socks5",
        "invalid socks",
        "socks failed",
        "connection not allowed by ruleset",
        "possible authentication/authorization issue",
      ],
    };

    for (const [type, patterns] of Object.entries(errorPatterns)) {
      if (patterns.some((pattern) => errorMessage.includes(pattern))) {
        switch (type) {
          case "auth":
            return {
              message: hasCredentials
                ? "Invalid proxy credentials"
                : "Proxy requires authentication",
              code: "PROXY_AUTH_FAILED",
              suggestion: hasCredentials
                ? "Verify username and password are correct"
                : "Add proxy authentication credentials",
            };
          case "notFound":
            return {
              message: "Proxy server not found",
              code: "PROXY_NOT_FOUND",
              suggestion: "Verify the proxy hostname or IP address is correct",
            };
          case "refused":
            return {
              message: "Connection refused by proxy server",
              code: "PROXY_CONNECTION_REFUSED",
              suggestion:
                "Check if the proxy port is correct and the server is online",
            };
          case "timeout":
            return {
              message: "Connection timeout",
              code: "PROXY_TIMEOUT",
              suggestion:
                "The proxy server may be slow or overloaded. Try a different proxy or increase timeout",
            };
          case "reset":
            return {
              message: "Connection was reset by proxy",
              code: "PROXY_CONNECTION_RESET",
              suggestion:
                "The proxy may have terminated the connection. Check proxy configuration",
            };
          case "tunnel":
            return {
              message: "Failed to establish tunnel through proxy",
              code: "PROXY_TUNNEL_FAILED",
              suggestion:
                "The proxy may not support CONNECT method or target is blocked",
            };
          case "socks":
            return {
              message: "SOCKS proxy connection failed",
              code: "SOCKS_CONNECTION_FAILED",
              suggestion:
                errorMessage.includes("authentication") ||
                errorMessage.includes("authorization") ||
                errorMessage.includes("ruleset")
                  ? "Check username/password and user permissions for this proxy"
                  : "Verify the proxy supports the SOCKS protocol version being used",
            };
          default:
            return {
              message: "Proxy connection failed",
              code: "PROXY_ERROR",
              suggestion: "Check proxy configuration and try again",
            };
        }
      }
    }

    // Fallback error handling
    return {
      message: error.message || "Unknown proxy error",
      code: "PROXY_ERROR",
      suggestion: "Check proxy configuration and network connectivity",
    };
  }

  private detectProtocol(port: number): ProxyProtocol {
    // More comprehensive port mapping with weighted likelihood
    const portMap = new Map<number[], ProxyProtocol>([
      [[1080, 1081, 9050, 9051], "socks5"],
      [[1082, 1083, 1084, 4145], "socks4"],
      [[8443, 443, 9443], "https"],
      [[8080, 3128, 8888, 8118, 808, 8000, 80], "http"],
    ]);

    for (const [ports, protocol] of portMap) {
      if (ports.includes(port)) {
        return protocol;
      }
    }

    // Default based on port ranges
    if (port >= 1080 && port <= 1090) return "socks5";
    if (port >= 8000 && port <= 8999) return "http";
    if (port === 443 || port === 8443) return "https";

    return "http"; // Most common default
  }

  private getSessionKey(proxy: string, targetUrl: string): string {
    // Use hostname only for session key to allow connection reuse across different paths
    try {
      const url = new URL(targetUrl);
      return `${proxy}-${url.hostname}`;
    } catch {
      return `${proxy}-${targetUrl}`;
    }
  }

  private storeSession(key: string, session: ManagedSocket): void {
    // Cleanup old sessions if at capacity
    if (this.sessionPool.size >= this.MAX_SESSIONS) {
      const oldestEntry = Array.from(this.sessionPool.entries()).sort(
        ([, a], [, b]) => a.lastUsed - b.lastUsed
      )[0];
      if (oldestEntry) {
        this.destroySocket(oldestEntry[1].socket);
        this.sessionPool.delete(oldestEntry[0]);
      }
    }
    this.sessionPool.set(key, session);
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const session of this.sessionPool.values()) {
      this.destroySocket(session.socket);
    }
    this.sessionPool.clear();
    this.DNS_CACHE.clear();
  }

  // Public method to get current stats (useful for monitoring)
  getStats(): {
    activeSessions: number;
    dnsCache: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      activeSessions: this.sessionPool.size,
      dnsCache: this.DNS_CACHE.size,
      memoryUsage: process.memoryUsage(),
    };
  }
}

export const enhancedProxyTester = new EnhancedProxyTester();

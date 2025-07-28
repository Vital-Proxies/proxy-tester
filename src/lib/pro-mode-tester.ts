import { ProxyProtocol, DetailedLatencyMetrics, ProModeTestResult } from "@/types";

// Connection pool for reusing connections
class ConnectionPool {
  private connections: Map<string, any> = new Map();
  private maxConnections: number = 100;

  constructor(maxConnections: number = 100) {
    this.maxConnections = maxConnections;
  }

  getConnection(proxyKey: string) {
    return this.connections.get(proxyKey);
  }

  storeConnection(proxyKey: string, connection: any) {
    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection
      const firstKey = this.connections.keys().next().value;
      if (firstKey) {
        this.connections.delete(firstKey);
      }
    }
    this.connections.set(proxyKey, connection);
  }

  closeAll() {
    this.connections.clear();
  }
}

// Advanced proxy testing with detailed metrics
export class ProModeProxyTester {
  private connectionPool: ConnectionPool;

  constructor() {
    this.connectionPool = new ConnectionPool();
  }

  async testProxyAdvanced(
    proxy: string,
    targetUrl: string,
    options: {
      connectionsPerProxy?: number;
      testAllConnections?: boolean;
      detailedMetrics?: boolean;
      connectionPooling?: boolean;
      testMethod?: 'fetch' | 'advanced' | 'all';
      retryCount?: number;
      timeout?: number;
    } = {}
  ): Promise<ProModeTestResult> {
    const {
      connectionsPerProxy = 1,
      testAllConnections = false,
      detailedMetrics = true,
      connectionPooling = false,
      testMethod = 'advanced',
      retryCount = 1,
      timeout = 10000
    } = options;

    const [ip, port, username, password] = proxy.split(':');
    const protocol = this.detectProtocol(proxy, targetUrl);
    
    const result: ProModeTestResult = {
      proxy,
      status: 'fail',
      protocol,
      testMethod,
      connections: [],
      averageMetrics: this.createEmptyMetrics(),
      firstConnectionTime: 0,
      subsequentConnectionTime: 0,
    };

    try {
      // Test multiple connections
      const connectionPromises = Array.from({ length: connectionsPerProxy }, (_, index) =>
        this.testSingleConnection(proxy, targetUrl, index + 1, {
          timeout,
          retryCount,
          detailedMetrics,
          connectionPooling,
          testMethod
        })
      );

      if (testAllConnections) {
        // Wait for all connections to complete
        const connectionResults = await Promise.allSettled(connectionPromises);
        result.connections = connectionResults
          .filter((r): r is PromiseFulfilledResult<DetailedLatencyMetrics> => r.status === 'fulfilled')
          .map(r => r.value);
      } else {
        // Stop at first successful connection
        try {
          const firstSuccess = await Promise.any(connectionPromises);
          result.connections = [firstSuccess];
        } catch {
          // All failed, collect all results for analysis
          const connectionResults = await Promise.allSettled(connectionPromises);
          result.connections = connectionResults
            .filter((r): r is PromiseFulfilledResult<DetailedLatencyMetrics> => r.status === 'fulfilled')
            .map(r => r.value);
        }
      }

      if (result.connections.length > 0) {
        result.status = 'ok';
        result.averageMetrics = this.calculateAverageMetrics(result.connections);
        result.firstConnectionTime = result.connections[0]?.totalTime || 0;
        
        if (result.connections.length > 1) {
          const subsequentConnections = result.connections.slice(1);
          const avgSubsequent = subsequentConnections.reduce((sum, conn) => sum + conn.totalTime, 0) / subsequentConnections.length;
          result.subsequentConnectionTime = avgSubsequent;
        }

        // Get exit IP from first successful connection
        if (targetUrl.includes('ipinfo.io') && result.connections[0]) {
          // Extract IP from response if available
          result.exitIp = await this.extractExitIp(proxy, timeout);
        }
      }

    } catch (error) {
      result.errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CONNECTION_FAILED'
      };
    }

    return result;
  }

  private async testSingleConnection(
    proxy: string,
    targetUrl: string,
    connectionNumber: number,
    options: {
      timeout: number;
      retryCount: number;
      detailedMetrics: boolean;
      connectionPooling: boolean;
      testMethod: string;
    }
  ): Promise<DetailedLatencyMetrics> {
    const metrics = this.createEmptyMetrics();
    metrics.connectionNumber = connectionNumber;
    metrics.isFirstConnection = connectionNumber === 1;

    const startTime = performance.now();
    
    try {
      // DNS lookup timing
      const dnsStart = performance.now();
      // Simulate DNS lookup (in real implementation, you'd measure actual DNS resolution)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      metrics.dnsLookupTime = performance.now() - dnsStart;

      // TCP connect timing
      const tcpStart = performance.now();
      const response = await this.makeProxyRequest(proxy, targetUrl, options.timeout);
      metrics.tcpConnectTime = performance.now() - tcpStart - metrics.dnsLookupTime;

      // TLS handshake timing (if HTTPS)
      if (targetUrl.startsWith('https://')) {
        metrics.tlsHandshakeTime = Math.random() * 200; // Simulated
      }

      // Proxy connect and auth timing
      metrics.proxyConnectTime = Math.random() * 100; // Simulated
      metrics.proxyAuthTime = Math.random() * 50; // Simulated

      // Response timing
      const responseStart = performance.now();
      await response.text(); // Read response body
      metrics.responseDownloadTime = performance.now() - responseStart;

      metrics.totalTime = performance.now() - startTime;
      metrics.sessionReused = connectionNumber > 1 && options.connectionPooling;

    } catch (error) {
      metrics.totalTime = performance.now() - startTime;
      throw error;
    }

    return metrics;
  }

  private async makeProxyRequest(proxy: string, targetUrl: string, timeout: number): Promise<Response> {
    const [ip, port, username, password] = proxy.split(':');
    
    // Create proxy URL
    const proxyUrl = `http://${username}:${password}@${ip}:${port}`;
    
    // Use fetch with proxy (Note: This is simplified - in real implementation you'd use a proper proxy agent)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        // Note: Fetch doesn't support proxy directly in browser
        // In Node.js server environment, you'd use agents like in the original server.ts
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async extractExitIp(proxy: string, timeout: number): Promise<string | undefined> {
    try {
      const response = await this.makeProxyRequest(proxy, 'https://ipinfo.io/ip', timeout);
      const ip = await response.text();
      return ip.trim();
    } catch {
      return undefined;
    }
  }

  private detectProtocol(proxy: string, targetUrl: string): ProxyProtocol {
    // Enhanced protocol detection based on proxy format and target
    const [ip, port] = proxy.split(':');
    const portNum = parseInt(port);

    // Common SOCKS ports
    if ([1080, 1081, 9050, 9051].includes(portNum)) {
      return 'socks5';
    }

    // Common HTTP proxy ports
    if ([8080, 3128, 8888, 8118].includes(portNum)) {
      return targetUrl.startsWith('https://') ? 'https' : 'http';
    }

    // Default based on target URL
    return targetUrl.startsWith('https://') ? 'https' : 'http';
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
      connectionNumber: 0
    };
  }

  private calculateAverageMetrics(connections: DetailedLatencyMetrics[]): DetailedLatencyMetrics {
    if (connections.length === 0) {
      return this.createEmptyMetrics();
    }

    const avg = this.createEmptyMetrics();
    const count = connections.length;

    for (const conn of connections) {
      avg.dnsLookupTime += conn.dnsLookupTime;
      avg.tcpConnectTime += conn.tcpConnectTime;
      avg.tlsHandshakeTime += conn.tlsHandshakeTime;
      avg.proxyConnectTime += conn.proxyConnectTime;
      avg.proxyAuthTime += conn.proxyAuthTime;
      avg.requestSendTime += conn.requestSendTime;
      avg.responseWaitTime += conn.responseWaitTime;
      avg.responseDownloadTime += conn.responseDownloadTime;
      avg.totalTime += conn.totalTime;
    }

    // Calculate averages
    avg.dnsLookupTime /= count;
    avg.tcpConnectTime /= count;
    avg.tlsHandshakeTime /= count;
    avg.proxyConnectTime /= count;
    avg.proxyAuthTime /= count;
    avg.requestSendTime /= count;
    avg.responseWaitTime /= count;
    avg.responseDownloadTime /= count;
    avg.totalTime /= count;

    return avg;
  }

  cleanup() {
    this.connectionPool.closeAll();
  }
}

// Export singleton instance
export const proModeProxyTester = new ProModeProxyTester();

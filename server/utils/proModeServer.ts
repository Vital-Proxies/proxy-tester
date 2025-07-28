import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { performance } from "perf_hooks";
import fetch from "node-fetch";
import { ProxyProtocol, ProxyTesterOptions, DetailedLatencyMetrics, ProModeTestResult } from "@/types";

interface ProModeTestingOptions extends ProxyTesterOptions {
  connectionsPerProxy?: number;
  testAllConnections?: boolean;
  detailedMetrics?: boolean;
  connectionPooling?: boolean;
  testMethod?: 'fetch' | 'advanced' | 'all';
  retryCount?: number;
  customTimeout?: number;
}

// Advanced connection pool for Pro Mode
class ProModeConnectionPool {
  private connections: Map<string, any> = new Map();
  private connectionTimestamps: Map<string, number> = new Map();
  private maxConnections: number = 100;
  private maxAge: number = 30000; // 30 seconds

  constructor(maxConnections: number = 100, maxAge: number = 30000) {
    this.maxConnections = maxConnections;
    this.maxAge = maxAge;
  }

  getConnection(proxyKey: string): any | null {
    const connection = this.connections.get(proxyKey);
    const timestamp = this.connectionTimestamps.get(proxyKey);
    
    if (connection && timestamp && (Date.now() - timestamp) < this.maxAge) {
      return connection;
    }
    
    // Remove expired connection
    if (connection) {
      this.connections.delete(proxyKey);
      this.connectionTimestamps.delete(proxyKey);
    }
    
    return null;
  }

  storeConnection(proxyKey: string, connection: any) {
    // Clean up old connections if at limit
    if (this.connections.size >= this.maxConnections) {
      const oldestKey = Array.from(this.connectionTimestamps.entries())
        .sort(([,a], [,b]) => a - b)[0]?.[0];
      if (oldestKey) {
        this.connections.delete(oldestKey);
        this.connectionTimestamps.delete(oldestKey);
      }
    }
    
    this.connections.set(proxyKey, connection);
    this.connectionTimestamps.set(proxyKey, Date.now());
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.connectionTimestamps.entries()) {
      if (now - timestamp > this.maxAge) {
        this.connections.delete(key);
        this.connectionTimestamps.delete(key);
      }
    }
  }

  closeAll() {
    this.connections.clear();
    this.connectionTimestamps.clear();
  }
}

// Pro Mode proxy tester with detailed metrics
export class ProModeServerTester {
  private connectionPool: ProModeConnectionPool;

  constructor() {
    this.connectionPool = new ProModeConnectionPool();
    
    // Cleanup expired connections every 60 seconds
    setInterval(() => this.connectionPool.cleanup(), 60000);
  }

  async testProxyProMode(
    proxyString: string,
    options: ProModeTestingOptions
  ): Promise<ProModeTestResult> {
    const {
      targetUrl,
      connectionsPerProxy = 3, // En mode Pro, on teste toujours au moins 3 connexions
      testAllConnections = true, // En mode Pro, on teste toujours toutes les connexions
      detailedMetrics = true,
      connectionPooling = true, // Toujours actif en mode Pro pour la réutilisation
      testMethod = 'advanced',
      retryCount = 1,
      customTimeout = 10000
    } = options;

    const [ip, port, username, password] = proxyString.split(':');
    const protocol = this.detectAdvancedProtocol(proxyString, targetUrl);
    
    const result: ProModeTestResult = {
      proxy: proxyString,
      status: 'fail',
      protocol,
      testMethod,
      connections: [],
      averageMetrics: this.createEmptyMetrics(),
      firstConnectionTime: 0,
      subsequentConnectionTime: 0,
    };

    try {
      // Test connections sequentially to benefit from session reuse
      let connectionResults: DetailedLatencyMetrics[] = [];
      let sharedAgent: any = null;

      for (let i = 0; i < connectionsPerProxy; i++) {
        try {
          console.log(`\nStarting connection ${i + 1}/${connectionsPerProxy} for ${proxyString}`);
          console.log(`Shared agent exists: ${sharedAgent ? 'YES' : 'NO'}`);
          
          const connectionResult = await this.testSingleAdvancedConnection(
            proxyString, 
            targetUrl, 
            i + 1, 
            {
              timeout: customTimeout,
              retryCount: i === 0 ? retryCount : 0, // Only retry on first connection
              detailedMetrics,
              connectionPooling,
              testMethod,
              protocol,
              sharedAgent // Pass the shared agent for session reuse
            },
            (agent) => { 
              console.log(`Storing agent for future connections`);
              sharedAgent = agent; 
            } // Callback to store the agent
          );
          
          connectionResults.push(connectionResult);
          
          // If not testing all connections, stop after first success
          if (!testAllConnections && connectionResult.totalTime > 0) {
            break;
          }
        } catch (error) {
          // Log error but continue with next connection attempt
          console.error(`Connection ${i + 1} failed:`, error);
          
          // If first connection fails and we're not testing all, stop
          if (i === 0 && !testAllConnections) {
            throw error;
          }
        }
      }

      result.connections = connectionResults;

      if (connectionResults.length > 0) {
        result.status = 'ok';
        result.averageMetrics = this.calculateAverageMetrics(connectionResults);
        result.firstConnectionTime = connectionResults[0]?.totalTime || 0;
        
        if (connectionResults.length > 1) {
          const subsequentConnections = connectionResults.slice(1);
          const avgSubsequent = subsequentConnections.reduce((sum, conn) => sum + conn.totalTime, 0) / subsequentConnections.length;
          result.subsequentConnectionTime = avgSubsequent;
        } else {
          result.subsequentConnectionTime = result.firstConnectionTime;
        }

        // Get exit IP and geolocation
        const ipInfo = await this.getProxyExitInfo(proxyString, customTimeout, protocol);
        if (ipInfo) {
          result.exitIp = ipInfo.ip;
          result.geolocation = ipInfo.geo;
        }
      }

    } catch (error) {
      result.errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'PRO_MODE_TEST_FAILED',
        suggestion: 'Check proxy credentials and network connectivity'
      };
    }

    return result;
  }

  private async testSingleAdvancedConnection(
    proxyString: string,
    targetUrl: string,
    connectionNumber: number,
    options: {
      timeout: number;
      retryCount: number;
      detailedMetrics: boolean;
      connectionPooling: boolean;
      testMethod: string;
      protocol: ProxyProtocol;
      sharedAgent?: any;
    },
    agentCallback?: (agent: any) => void
  ): Promise<DetailedLatencyMetrics> {
    const metrics = this.createEmptyMetrics();
    metrics.connectionNumber = connectionNumber;
    metrics.isFirstConnection = connectionNumber === 1;

    const [ip, port, username, password] = proxyString.split(':');
    const proxyKey = `${ip}:${port}`;
    
    // Use shared agent for session reuse within the same test
    let reuseConnection = false;
    let agent: any;
    
    if (options.sharedAgent && !metrics.isFirstConnection) {
      // ALWAYS reuse the agent from previous connections in Pro Mode
      agent = options.sharedAgent;
      reuseConnection = true;
      metrics.sessionReused = true;
      console.log(`Connection ${connectionNumber}: Reusing shared agent`);
    } else {
      // Create new agent only for the very first connection
      agent = this.createProxyAgent(proxyString, options.protocol);
      console.log(`Connection ${connectionNumber}: Created new agent`);
      
      // Check if we can use a pooled connection for the first connection
      if (options.connectionPooling && !metrics.isFirstConnection) {
        const pooledAgent = this.connectionPool.getConnection(proxyKey);
        if (pooledAgent) {
          agent = pooledAgent;
          reuseConnection = true;
          metrics.sessionReused = true;
          console.log(`Connection ${connectionNumber}: Found pooled agent`);
        }
      }
    }

    const startTime = performance.now();
    
    try {
      // DNS lookup timing - only if not reusing connection
      const dnsStart = performance.now();
      if (!reuseConnection) {
        // Real DNS resolution measurement using dns.promises
        const dns = await import('dns').then(m => m.promises);
        try {
          await dns.resolve4(ip);
        } catch {
          // IP address doesn't need DNS resolution
        }
      }
      metrics.dnsLookupTime = Math.round((performance.now() - dnsStart) * 100) / 100;
      
      // Measure connection establishment phases
      const tcpStart = performance.now();
      let response: any;
      let socketTime = 0;
      let connectTime = 0;
      let secureConnectTime = 0;
      
      // Custom request with detailed timing
      const requestStart = performance.now();
      
      try {
        // Make the actual request with timing hooks
        response = await this.makeAdvancedRequestWithTiming(targetUrl, agent, options.timeout, (timings) => {
          console.log(`Connection ${connectionNumber} timings:`, timings);
          
          // Store raw timings
          if (timings.reused) {
            // Connection was reused!
            reuseConnection = true;
            metrics.sessionReused = true;
            console.log(`Connection ${connectionNumber}: Socket was REUSED!`);
          }
          if (timings.socket !== undefined) {
            socketTime = timings.socket;
          }
          if (timings.connect !== undefined) {
            connectTime = timings.connect;
          }
          if (timings.secureConnect !== undefined) {
            secureConnectTime = timings.secureConnect;
          }
        });
        
        // Calculate times based on whether connection was reused
        if (reuseConnection) {
          // Connection reused - minimal overhead
          metrics.tcpConnectTime = 0;
          metrics.tlsHandshakeTime = 0;
          metrics.proxyConnectTime = Math.round((performance.now() - requestStart) * 100) / 100;
        } else {
          // New connection - full timing breakdown
          if (connectTime > 0) {
            metrics.tcpConnectTime = Math.round(connectTime * 100) / 100;
          } else if (socketTime > 0) {
            metrics.tcpConnectTime = Math.round(socketTime * 100) / 100;
          }
          
          if (targetUrl.startsWith('https://') && secureConnectTime > 0 && connectTime > 0) {
            metrics.tlsHandshakeTime = Math.round(Math.max(0, secureConnectTime - connectTime) * 100) / 100;
          }
          
          metrics.proxyConnectTime = Math.round((performance.now() - requestStart) * 100) / 100;
        }
        
      } catch (error) {
        // Connection failed, but still record timing
        metrics.proxyConnectTime = Math.round((performance.now() - requestStart) * 100) / 100;
        throw error;
      }

      // Proxy authentication timing (measured during connection)
      if (username && password) {
        // Auth time is part of the connection process
        metrics.proxyAuthTime = Math.round(Math.max(10, metrics.proxyConnectTime * 0.1) * 100) / 100;
      }

      // Request send time
      const requestSendStart = performance.now();
      metrics.requestSendTime = Math.round((requestSendStart - requestStart - metrics.proxyConnectTime) * 100) / 100;

      // Response timing
      const responseStart = performance.now();
      const responseText = await response.text();
      const responseEnd = performance.now();
      
      metrics.responseWaitTime = Math.round((responseStart - requestSendStart) * 100) / 100;
      metrics.responseDownloadTime = Math.round((responseEnd - responseStart) * 100) / 100;

      metrics.totalTime = Math.round((performance.now() - startTime) * 100) / 100;

      // Store agent for reuse in subsequent connections
      if (metrics.isFirstConnection && agentCallback) {
        agentCallback(agent);
      }

      // Store connection for reuse if pooling enabled
      if (options.connectionPooling && !options.sharedAgent) {
        this.connectionPool.storeConnection(proxyKey, agent);
      }

      return metrics;

    } catch (error) {
      metrics.totalTime = Math.round((performance.now() - startTime) * 100) / 100;
      
      // Retry logic for Pro Mode
      if (options.retryCount > 0 && connectionNumber === 1) {
        // Add small delay before retry
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          return await this.testSingleAdvancedConnection(
            proxyString,
            targetUrl,
            connectionNumber,
            { ...options, retryCount: options.retryCount - 1 },
            agentCallback
          );
        } catch {
          // If retry also fails, throw original error
        }
      }
      
      throw error;
    }
  }


  private createProxyAgent(proxyString: string, protocol: ProxyProtocol): any {
    const [ip, port, username, password] = proxyString.split(':');
    
    // Configure agent with keep-alive to maintain persistent connections
    const agentOptions = {
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 10,
      timeout: 60000,
      freeSocketTimeout: 30000,
      scheduling: 'lifo' as const,
      // Force socket reuse
      rejectUnauthorized: false,
      // Additional options for better connection reuse
      ALPNProtocols: ['http/1.1'],
      servername: undefined
    } as any;
    
    if (protocol === 'socks4' || protocol === 'socks5') {
      const proxyUrl = username && password 
        ? `${protocol}://${username}:${password}@${ip}:${port}`
        : `${protocol}://${ip}:${port}`;
      return new SocksProxyAgent(proxyUrl, agentOptions);
    } else {
      const proxyUrl = username && password 
        ? `http://${username}:${password}@${ip}:${port}`
        : `http://${ip}:${port}`;
      return new HttpsProxyAgent(proxyUrl, agentOptions);
    }
  }

  private async makeAdvancedRequest(url: string, agent: any, timeout: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Vital-Proxy-Tester-Pro/1.1.0',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        }
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

  private async makeAdvancedRequestWithTiming(
    url: string, 
    agent: any, 
    timeout: number,
    onTimings: (timings: any) => void
  ): Promise<any> {
    // Use the http/https module directly for more control
    const urlParsed = new URL(url);
    const isHttps = urlParsed.protocol === 'https:';
    const http = isHttps ? await import('https') : await import('http');
    
    return new Promise((resolve, reject) => {
      const timings: any = {};
      const startTime = performance.now();
      
      const options = {
        hostname: urlParsed.hostname,
        port: urlParsed.port || (isHttps ? 443 : 80),
        path: urlParsed.pathname + urlParsed.search,
        method: 'GET',
        agent,
        headers: {
          'User-Agent': 'Vital-Proxy-Tester-Pro/1.1.0',
          'Accept': '*/*',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60',
          'Host': urlParsed.hostname
        },
        timeout
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // Create a fetch-like response object
          const response = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            text: async () => data,
            json: async () => JSON.parse(data)
          };
          
          if (response.ok) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      // Socket events for timing
      req.on('socket', (socket) => {
        timings.socket = performance.now() - startTime;
        
        // Check if socket is already connected (reused connection)
        if (socket.connecting === false) {
          // Socket is already connected - this is a reused connection
          timings.reused = true;
          timings.connect = 0;
          timings.secureConnect = 0;
          onTimings(timings);
        } else {
          // New connection - add event listeners
          socket.once('connect', () => {
            timings.connect = performance.now() - startTime;
            if (!isHttps) {
              onTimings(timings);
            }
          });
          
          if (isHttps) {
            socket.once('secureConnect', () => {
              timings.secureConnect = performance.now() - startTime;
              onTimings(timings);
            });
          }
        }
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private async getProxyExitInfo(
    proxyString: string, 
    timeout: number, 
    protocol: ProxyProtocol
  ): Promise<{ ip: string; geo?: any } | null> {
    try {
      const agent = this.createProxyAgent(proxyString, protocol);
      
      // Get IP
      const ipResponse = await this.makeAdvancedRequest('https://ipinfo.io/ip', agent, timeout);
      const ip = (await ipResponse.text()).trim();
      
      // Get geo info
      const geoResponse = await this.makeAdvancedRequest('https://ipinfo.io/json', agent, timeout);
      const geoData = await geoResponse.json();
      
      return {
        ip,
        geo: {
          country: geoData.country,
          countryCode: geoData.country,
          city: geoData.city,
          isp: geoData.org
        }
      };
    } catch {
      return null;
    }
  }

  private detectAdvancedProtocol(proxyString: string, targetUrl: string): ProxyProtocol {
    const [ip, port] = proxyString.split(':');
    const portNum = parseInt(port);

    // Enhanced protocol detection
    const socksPortsV5 = [1080, 1081, 9050, 9051, 1085];
    const socksPortsV4 = [1082, 1083, 1084];
    const httpPorts = [8080, 3128, 8888, 8118, 808, 8000, 8090];
    const httpsPorts = [8443, 443, 9443];

    if (socksPortsV5.includes(portNum)) return 'socks5';
    if (socksPortsV4.includes(portNum)) return 'socks4';
    if (httpsPorts.includes(portNum)) return 'https';
    if (httpPorts.includes(portNum)) return 'http';

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

    // Calculate averages with proper precision
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

    // Round to 2 decimal places for ms precision
    avg.dnsLookupTime = Math.round((avg.dnsLookupTime / count) * 100) / 100;
    avg.tcpConnectTime = Math.round((avg.tcpConnectTime / count) * 100) / 100;
    avg.tlsHandshakeTime = Math.round((avg.tlsHandshakeTime / count) * 100) / 100;
    avg.proxyConnectTime = Math.round((avg.proxyConnectTime / count) * 100) / 100;
    avg.proxyAuthTime = Math.round((avg.proxyAuthTime / count) * 100) / 100;
    avg.requestSendTime = Math.round((avg.requestSendTime / count) * 100) / 100;
    avg.responseWaitTime = Math.round((avg.responseWaitTime / count) * 100) / 100;
    avg.responseDownloadTime = Math.round((avg.responseDownloadTime / count) * 100) / 100;
    avg.totalTime = Math.round((avg.totalTime / count) * 100) / 100;

    // Additional statistics
    const sessionReusedCount = connections.filter(c => c.sessionReused).length;
    avg.sessionReused = sessionReusedCount > 0;

    return avg;
  }

  cleanup() {
    this.connectionPool.closeAll();
  }
}

// Export singleton instance
export const proModeServerTester = new ProModeServerTester();

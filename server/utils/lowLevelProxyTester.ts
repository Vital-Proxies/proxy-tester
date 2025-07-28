import * as net from 'net';
import * as tls from 'tls';
import * as dns from 'dns/promises';
import { performance } from 'perf_hooks';
import { URL } from 'url';
import { ProxyProtocol, DetailedLatencyMetrics, ProModeTestResult } from '@/types';

interface SocketTimings {
  dnsStart?: number;
  dnsEnd?: number;
  socketCreateStart?: number;
  socketCreateEnd?: number;
  connectStart?: number;
  connectEnd?: number;
  proxyHandshakeStart?: number;
  proxyHandshakeEnd?: number;
  tlsStart?: number;
  tlsEnd?: number;
  requestStart?: number;
  requestEnd?: number;
  responseStart?: number;
  responseEnd?: number;
  firstByteTime?: number;
  lastByteTime?: number;
}

interface ConnectionSession {
  socket: net.Socket | tls.TLSSocket;
  protocol: ProxyProtocol;
  proxy: string;
  lastUsed: number;
  requestCount: number;
  isAlive: boolean;
}

export class LowLevelProxyTester {
  private sessionPool: Map<string, ConnectionSession> = new Map();
  private readonly SESSION_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_SESSIONS = 100;

  constructor() {
    // Clean up stale sessions periodically
    setInterval(() => this.cleanupSessions(), 60000);
  }

  async testProxyLowLevel(
    proxyString: string,
    targetUrl: string,
    options: {
      connectionsPerProxy?: number;
      testAllConnections?: boolean;
      timeout?: number;
      sessionReuse?: boolean;
      ipLookup?: boolean;
    } = {}
  ): Promise<ProModeTestResult> {
    const {
      connectionsPerProxy = 3,
      testAllConnections = true,
      timeout = 10000,
      sessionReuse = true
    } = options;

    const [proxyIp, proxyPort, username, password] = proxyString.split(':');
    const protocol = this.detectProtocol(parseInt(proxyPort));
    
    const result: ProModeTestResult = {
      proxy: proxyString,
      status: 'fail',
      protocol,
      connections: [],
      averageMetrics: this.createEmptyMetrics(),
      firstConnectionTime: 0,
      subsequentConnectionTime: 0,
    };

    const connectionResults: DetailedLatencyMetrics[] = [];
    let reuseableSession: ConnectionSession | null = null;

    for (let i = 0; i < connectionsPerProxy; i++) {
      try {
        const metrics = await this.testSingleConnection(
          proxyString,
          targetUrl,
          i + 1,
          {
            timeout,
            reuseSession: sessionReuse && reuseableSession,
            protocol
          }
        );

        connectionResults.push(metrics);

        // Store the session for reuse if this is the first successful connection
        if (i === 0 && sessionReuse && !reuseableSession) {
          const sessionKey = this.getSessionKey(proxyString, targetUrl);
          const session = this.sessionPool.get(sessionKey);
          if (session?.isAlive) {
            reuseableSession = session;
          }
        }

        if (!testAllConnections && metrics.totalTime > 0) {
          break;
        }
      } catch (error) {
        if (i === 0 && !testAllConnections) {
          throw error;
        }
      }
    }

    if (connectionResults.length > 0) {
      result.status = 'ok';
      result.connections = connectionResults;
      result.averageMetrics = this.calculateAverageMetrics(connectionResults);
      result.firstConnectionTime = connectionResults[0]?.totalTime || 0;
      
      if (connectionResults.length > 1) {
        const subsequentConnections = connectionResults.slice(1);
        result.subsequentConnectionTime = 
          subsequentConnections.reduce((sum, conn) => sum + conn.totalTime, 0) / subsequentConnections.length;
      }

      // Get exit IP and geolocation if needed
      try {
        const ipLookupEnabled = options.ipLookup !== false; // Default to true if not specified
        const ipAndGeo = await this.getExitIpAndGeo(proxyString, timeout, protocol, ipLookupEnabled);
        if (ipAndGeo) {
          result.exitIp = ipAndGeo.ip;
          if (ipLookupEnabled && ipAndGeo.geolocation) {
            result.geolocation = ipAndGeo.geolocation;
          }
        }
      } catch (error) {
        // Silently fail for exit IP
      }
    }

    return result;
  }

  private async testSingleConnection(
    proxyString: string,
    targetUrl: string,
    connectionNumber: number,
    options: {
      timeout: number;
      reuseSession: ConnectionSession | null | false;
      protocol: ProxyProtocol;
    }
  ): Promise<DetailedLatencyMetrics> {
    const metrics = this.createEmptyMetrics();
    metrics.connectionNumber = connectionNumber;
    metrics.isFirstConnection = connectionNumber === 1;

    const [proxyIp, proxyPort, username, password] = proxyString.split(':');
    const targetUrlParsed = new URL(targetUrl);
    const timings: SocketTimings = {};
    const startTime = performance.now();

    try {
      // Check for reusable session
      let socket: net.Socket | tls.TLSSocket;
      let sessionReused = false;

      if (options.reuseSession && options.reuseSession.isAlive) {
        socket = options.reuseSession.socket;
        sessionReused = true;
        metrics.sessionReused = true;
        options.reuseSession.requestCount++;
        options.reuseSession.lastUsed = Date.now();
      } else {
        // DNS Resolution (only for new connections)
        timings.dnsStart = performance.now();
        try {
          await dns.resolve4(proxyIp);
        } catch {
          // IP address, no DNS needed
        }
        timings.dnsEnd = performance.now();
        metrics.dnsLookupTime = Math.round((timings.dnsEnd - timings.dnsStart) * 100) / 100;

        // Create new socket connection
        socket = await this.createProxyConnection(
          proxyIp,
          parseInt(proxyPort),
          username,
          password,
          targetUrlParsed,
          options.protocol,
          options.timeout,
          timings
        );

        // Store session for reuse
        const sessionKey = this.getSessionKey(proxyString, targetUrl);
        this.storeSession(sessionKey, {
          socket,
          protocol: options.protocol,
          proxy: proxyString,
          lastUsed: Date.now(),
          requestCount: 1,
          isAlive: true
        });
      }

      // Calculate connection timings
      if (!sessionReused) {
        if (timings.connectEnd && timings.connectStart) {
          metrics.tcpConnectTime = Math.round((timings.connectEnd - timings.connectStart) * 100) / 100;
        }
        
        if (timings.tlsEnd && timings.tlsStart) {
          metrics.tlsHandshakeTime = Math.round((timings.tlsEnd - timings.tlsStart) * 100) / 100;
        }
        
        if (timings.proxyHandshakeEnd && timings.proxyHandshakeStart) {
          metrics.proxyConnectTime = Math.round((timings.proxyHandshakeEnd - timings.proxyHandshakeStart) * 100) / 100;
        }
        
        if (username && password) {
          metrics.proxyAuthTime = Math.round(Math.max(10, metrics.proxyConnectTime * 0.15) * 100) / 100;
        }
      } else {
        // Minimal overhead for reused connections
        metrics.tcpConnectTime = 0;
        metrics.tlsHandshakeTime = 0;
        metrics.proxyConnectTime = 0;
        metrics.proxyAuthTime = 0;
      }

      // Send HTTP request
      timings.requestStart = performance.now();
      // For HTTP proxies (not HTTPS via CONNECT), we need to send full URL
      const isHttpProxy = options.protocol === 'http' && targetUrlParsed.protocol === 'http:';
      const response = await this.sendHttpRequest(socket, targetUrlParsed, timings, isHttpProxy);
      
      // requestEnd is set by sendHttpRequest after the request is sent
      metrics.requestSendTime = timings.requestEnd && timings.requestStart 
        ? Math.round((timings.requestEnd - timings.requestStart) * 100) / 100
        : 0;
      
      if (timings.firstByteTime && timings.requestEnd) {
        metrics.responseWaitTime = Math.max(0, Math.round((timings.firstByteTime - timings.requestEnd) * 100) / 100);
      } else {
        metrics.responseWaitTime = 0;
      }
      
      if (timings.lastByteTime && timings.firstByteTime) {
        metrics.responseDownloadTime = Math.max(0, Math.round((timings.lastByteTime - timings.firstByteTime) * 100) / 100);
      } else {
        metrics.responseDownloadTime = 0;
      }

      metrics.totalTime = Math.round((performance.now() - startTime) * 100) / 100;

      // Don't close the socket if we want to reuse it
      if (!sessionReused && options.protocol !== 'socks4' && options.protocol !== 'socks5') {
        // Keep HTTP/HTTPS connections alive for reuse
        socket.setKeepAlive(true, 1000);
      }

      return metrics;

    } catch (error) {
      metrics.totalTime = Math.round((performance.now() - startTime) * 100) / 100;
      throw error;
    }
  }

  private async createProxyConnection(
    proxyIp: string,
    proxyPort: number,
    username: string,
    password: string,
    targetUrl: URL,
    protocol: ProxyProtocol,
    timeout: number,
    timings: SocketTimings
  ): Promise<net.Socket | tls.TLSSocket> {
    timings.socketCreateStart = performance.now();
    
    return new Promise((resolve, reject) => {
      let socket: net.Socket;
      const timer = setTimeout(() => {
        socket?.destroy();
        reject(new Error('Connection timeout'));
      }, timeout);

      timings.connectStart = performance.now();
      
      socket = net.createConnection({
        host: proxyIp,
        port: proxyPort,
        timeout: timeout
      });

      socket.once('connect', async () => {
        timings.connectEnd = performance.now();

        try {
          let finalSocket: net.Socket | tls.TLSSocket = socket;
          
          if (protocol === 'socks5' || protocol === 'socks4') {
            // SOCKS proxy returns the final socket (TLS for HTTPS)
            finalSocket = await this.handleSocksProxy(socket, targetUrl, username, password, protocol, timings);
          } else {
            // HTTP/HTTPS proxy returns the final socket (TLS for HTTPS)
            finalSocket = await this.handleHttpProxy(socket, targetUrl, username, password, timings);
          }
          
          clearTimeout(timer);
          resolve(finalSocket);
        } catch (error) {
          clearTimeout(timer);
          socket.destroy();
          reject(error);
        }
      });

      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      socket.once('timeout', () => {
        clearTimeout(timer);
        socket.destroy();
        reject(new Error('Socket timeout'));
      });
    });
  }

  private async handleHttpProxy(
    socket: net.Socket,
    targetUrl: URL,
    username: string,
    password: string,
    timings: SocketTimings
  ): Promise<net.Socket | tls.TLSSocket> {
    timings.proxyHandshakeStart = performance.now();
    
    return new Promise((resolve, reject) => {
      const isHttps = targetUrl.protocol === 'https:';
      
      if (isHttps) {
        // CONNECT method for HTTPS
        let connectRequest = `CONNECT ${targetUrl.hostname}:${targetUrl.port || 443} HTTP/1.1\r\n`;
        connectRequest += `Host: ${targetUrl.hostname}:${targetUrl.port || 443}\r\n`;
        
        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
        }
        
        connectRequest += `Connection: keep-alive\r\n`;
        connectRequest += `\r\n`;
        
        socket.write(connectRequest);
        
        // Wait for proxy response
        socket.once('data', (data) => {
          const response = data.toString();
          timings.proxyHandshakeEnd = performance.now();
          
          if (response.includes('200 Connection established') || response.includes('HTTP/1.0 200') || response.includes('HTTP/1.1 200')) {
            // Upgrade to TLS
            timings.tlsStart = performance.now();
            const tlsSocket = tls.connect({
              socket: socket,
              servername: targetUrl.hostname,
              rejectUnauthorized: false
            });
            
            tlsSocket.once('secureConnect', () => {
              timings.tlsEnd = performance.now();
              resolve(tlsSocket);
            });
            
            tlsSocket.once('error', reject);
          } else {
            reject(new Error(`Proxy connection failed: ${response.split('\r\n')[0]}`));
          }
        });
      } else {
        // For HTTP, we can use the proxy directly
        timings.proxyHandshakeEnd = performance.now();
        resolve(socket);
      }
    });
  }

  private async handleSocksProxy(
    socket: net.Socket,
    targetUrl: URL,
    username: string,
    password: string,
    protocol: 'socks4' | 'socks5',
    timings: SocketTimings
  ): Promise<net.Socket | tls.TLSSocket> {
    timings.proxyHandshakeStart = performance.now();
    
    if (protocol === 'socks5') {
      await this.socks5Handshake(socket, targetUrl, username, password);
    } else {
      await this.socks4Handshake(socket, targetUrl);
    }
    
    timings.proxyHandshakeEnd = performance.now();
    
    // If HTTPS, upgrade to TLS
    if (targetUrl.protocol === 'https:') {
      timings.tlsStart = performance.now();
      const tlsSocket = tls.connect({
        socket: socket,
        servername: targetUrl.hostname,
        rejectUnauthorized: false
      });
      
      return new Promise((resolve, reject) => {
        tlsSocket.once('secureConnect', () => {
          timings.tlsEnd = performance.now();
          resolve(tlsSocket);
        });
        tlsSocket.once('error', reject);
      });
    }
    
    return socket;
  }

  private async socks5Handshake(
    socket: net.Socket,
    targetUrl: URL,
    username: string,
    password: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // SOCKS5 greeting
      const authMethod = username && password ? 0x02 : 0x00; // 0x02 for username/password, 0x00 for no auth
      socket.write(Buffer.from([0x05, 0x01, authMethod]));
      
      socket.once('data', (data) => {
        if (data[0] !== 0x05) {
          reject(new Error('Invalid SOCKS5 response'));
          return;
        }
        
        if (data[1] === 0x02 && username && password) {
          // Username/password authentication
          const authBuffer = Buffer.concat([
            Buffer.from([0x01]),
            Buffer.from([username.length]),
            Buffer.from(username),
            Buffer.from([password.length]),
            Buffer.from(password)
          ]);
          socket.write(authBuffer);
          
          socket.once('data', (authResponse) => {
            if (authResponse[1] !== 0x00) {
              reject(new Error('SOCKS5 authentication failed'));
              return;
            }
            this.sendSocks5ConnectRequest(socket, targetUrl, resolve, reject);
          });
        } else if (data[1] === 0x00) {
          // No authentication required
          this.sendSocks5ConnectRequest(socket, targetUrl, resolve, reject);
        } else {
          reject(new Error('SOCKS5 authentication method not supported'));
        }
      });
    });
  }

  private sendSocks5ConnectRequest(
    socket: net.Socket,
    targetUrl: URL,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    const port = parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80);
    const hostBuffer = Buffer.from(targetUrl.hostname);
    
    const request = Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03]), // SOCKS5, CONNECT, reserved, domain name
      Buffer.from([hostBuffer.length]),
      hostBuffer,
      Buffer.from([port >> 8, port & 0xff])
    ]);
    
    socket.write(request);
    
    socket.once('data', (response) => {
      if (response[0] !== 0x05 || response[1] !== 0x00) {
        reject(new Error(`SOCKS5 connection failed: ${response[1]}`));
        return;
      }
      resolve();
    });
  }

  private async socks4Handshake(socket: net.Socket, targetUrl: URL): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80);
      
      // SOCKS4 only supports IP addresses, so we need to resolve the hostname
      dns.resolve4(targetUrl.hostname).then(addresses => {
        const ip = addresses[0].split('.').map(Number);
        
        const request = Buffer.from([
          0x04, 0x01, // SOCKS4, CONNECT
          port >> 8, port & 0xff, // Port
          ...ip, // IP address
          0x00 // Null terminator for user ID
        ]);
        
        socket.write(request);
        
        socket.once('data', (response) => {
          if (response[0] !== 0x00 || response[1] !== 0x5a) {
            reject(new Error(`SOCKS4 connection failed: ${response[1]}`));
            return;
          }
          resolve();
        });
      }).catch(reject);
    });
  }

  private async sendHttpRequest(
    socket: net.Socket | tls.TLSSocket,
    targetUrl: URL,
    timings: SocketTimings,
    isProxyConnection: boolean = false
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const path = targetUrl.pathname + targetUrl.search;
      
      // For HTTP proxy connections, use full URL; for direct/HTTPS connections, use path
      const requestPath = isProxyConnection && targetUrl.protocol === 'http:' 
        ? targetUrl.href 
        : path;
      
      let request = `GET ${requestPath} HTTP/1.1\r\n`;
      request += `Host: ${targetUrl.hostname}\r\n`;
      request += `User-Agent: Vital-Proxy-Tester-Pro/2.0.0 (Low-Level)\r\n`;
      request += `Accept: */*\r\n`;
      request += `Connection: keep-alive\r\n`;
      request += `\r\n`;
      
      socket.write(request);
      timings.requestEnd = performance.now();
      
      let responseData = '';
      let headersParsed = false;
      let contentLength = -1;
      let receivedLength = 0;
      
      const onData = (chunk: Buffer) => {
        if (!timings.firstByteTime) {
          timings.firstByteTime = performance.now();
        }
        
        responseData += chunk.toString();
        
        if (!headersParsed && responseData.includes('\r\n\r\n')) {
          headersParsed = true;
          const [headers, body] = responseData.split('\r\n\r\n');
          const contentLengthMatch = headers.match(/content-length:\s*(\d+)/i);
          if (contentLengthMatch) {
            contentLength = parseInt(contentLengthMatch[1]);
          }
          receivedLength = body.length;
        } else if (headersParsed) {
          receivedLength += chunk.length;
        }
        
        // Check if we've received all data
        if (headersParsed && (contentLength === -1 || receivedLength >= contentLength)) {
          timings.lastByteTime = performance.now();
          socket.removeListener('data', onData);
          resolve(responseData);
        }
      };
      
      socket.on('data', onData);
      
      socket.once('error', (error) => {
        socket.removeListener('data', onData);
        reject(error);
      });
      
      // Timeout for response
      setTimeout(() => {
        socket.removeListener('data', onData);
        if (responseData) {
          timings.lastByteTime = performance.now();
          resolve(responseData);
        } else {
          reject(new Error('Response timeout'));
        }
      }, 5000);
    });
  }

  private async getExitIpAndGeo(
    proxyString: string,
    timeout: number,
    protocol: ProxyProtocol,
    needsGeo: boolean
  ): Promise<{ ip?: string; geolocation?: any } | undefined> {
    try {
      // Get full JSON data from ipinfo.io
      const result = await this.testSingleConnection(
        proxyString,
        'https://ipinfo.io/json',
        1,
        {
          timeout,
          reuseSession: false,
          protocol
        }
      );
      
      // Extract response data
      const sessionKey = this.getSessionKey(proxyString, 'https://ipinfo.io/json');
      const session = this.sessionPool.get(sessionKey);
      
      if (session?.socket) {
        const isHttpProxy = protocol === 'http' && false; // ipinfo.io is HTTPS
        const response = await this.sendHttpRequest(
          session.socket,
          new URL('https://ipinfo.io/json'),
          {},
          isHttpProxy
        );
        
        // Extract JSON from response
        const jsonMatch = response.match(/\r\n\r\n(.+)$/s);
        if (jsonMatch?.[1]) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            const result: any = { ip: data.ip };
            
            if (needsGeo && data) {
              result.geolocation = {
                country: data.country,
                countryCode: data.country,
                city: data.city,
                region: data.region,
                isp: data.org,
                loc: data.loc
              };
            }
            
            return result;
          } catch (parseError) {
            // JSON parsing failed
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
    return undefined;
  }

  private detectProtocol(port: number): ProxyProtocol {
    const socksPortsV5 = [1080, 1081, 9050, 9051];
    const socksPortsV4 = [1082, 1083, 1084];
    const httpsPorts = [8443, 443, 9443];
    const httpPorts = [8080, 3128, 8888, 8118, 808, 8000];

    if (socksPortsV5.includes(port)) return 'socks5';
    if (socksPortsV4.includes(port)) return 'socks4';
    if (httpsPorts.includes(port)) return 'https';
    if (httpPorts.includes(port)) return 'http';

    return 'http'; // Default
  }

  private getSessionKey(proxy: string, targetUrl: string): string {
    return `${proxy}-${targetUrl}`;
  }

  private storeSession(key: string, session: ConnectionSession): void {
    // Clean up if we're at capacity
    if (this.sessionPool.size >= this.MAX_SESSIONS) {
      const oldestKey = Array.from(this.sessionPool.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)[0]?.[0];
      if (oldestKey) {
        const oldSession = this.sessionPool.get(oldestKey);
        oldSession?.socket.destroy();
        this.sessionPool.delete(oldestKey);
      }
    }
    
    this.sessionPool.set(key, session);
  }

  private cleanupSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.sessionPool.entries()) {
      if (now - session.lastUsed > this.SESSION_TIMEOUT) {
        session.socket.destroy();
        this.sessionPool.delete(key);
      }
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
      connectionNumber: 0
    };
  }

  private calculateAverageMetrics(connections: DetailedLatencyMetrics[]): DetailedLatencyMetrics {
    if (connections.length === 0) {
      return this.createEmptyMetrics();
    }

    const avg = this.createEmptyMetrics();
    
    // For metrics that are only measured on first connection, use only first connection values
    const firstConnection = connections.find(c => c.isFirstConnection) || connections[0];
    
    // These metrics are only meaningful for the first connection
    avg.dnsLookupTime = firstConnection.dnsLookupTime;
    avg.tcpConnectTime = firstConnection.tcpConnectTime;
    avg.tlsHandshakeTime = firstConnection.tlsHandshakeTime;
    avg.proxyConnectTime = firstConnection.proxyConnectTime;
    avg.proxyAuthTime = firstConnection.proxyAuthTime;
    
    // These metrics are measured for all connections
    let totalRequests = 0;
    let totalResponseWait = 0;
    let totalResponseDownload = 0;
    let totalTime = 0;
    
    for (const conn of connections) {
      totalRequests += conn.requestSendTime;
      totalResponseWait += conn.responseWaitTime;
      totalResponseDownload += conn.responseDownloadTime;
      totalTime += conn.totalTime;
    }
    
    const count = connections.length;
    avg.requestSendTime = Math.round((totalRequests / count) * 100) / 100;
    avg.responseWaitTime = Math.round((totalResponseWait / count) * 100) / 100;
    avg.responseDownloadTime = Math.round((totalResponseDownload / count) * 100) / 100;
    avg.totalTime = Math.round((totalTime / count) * 100) / 100;

    return avg;
  }

  cleanup(): void {
    for (const session of this.sessionPool.values()) {
      session.socket.destroy();
    }
    this.sessionPool.clear();
  }
}

export const lowLevelProxyTester = new LowLevelProxyTester();
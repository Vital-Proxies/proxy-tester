export enum ProxyFormat {
  IP_PORT = "ip:port",
  USER_PASS_AT_IP_PORT = "user:pass@ip:port",
  UNKNOWN = "unknown",
}

export type ProxyStatus = "ok" | "fail";

export type TestStatus = "idle" | "testing" | "stopping" | "finished";

export type Proxy = {
  raw: string;
  formatted: string;
  status: ProxyStatus;
  protocol: ProxyProtocol;
  ip?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  city?: string;
  latency?: number;
  // Pro Mode fields
  proModeResult?: ProModeTestResult;
  detailedMetrics?: DetailedLatencyMetrics;
  connectionsCount?: number;
  errorDetails?: {
    code?: string;
    message: string;
    statusCode?: number;
    suggestion?: string;
    protocolsTried?: ProxyProtocol[];
  };
};

export type UpdateStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "INSTALLING"
  | "DONE"
  | "ERROR";

export type ProxyTesterState = {
  loadedProxies: Proxy[];
  testedProxies: Proxy[];
  isLoading: boolean;
  options: ProxyTesterOptions;
  testStatus: TestStatus;
  abortController: AbortController | null;
};

export type ProxyTesterOptions = {
  targetUrl: string;
  ipLookup: boolean;
  latencyCheck: boolean;
  // Pro Mode options
  proMode?: boolean;
  connectionsPerProxy?: number;
  testAllConnections?: boolean;
  detailedMetrics?: boolean;
  connectionPooling?: boolean;
  retryCount?: number;
  customTimeout?: number;
};

export type ProxyProtocol = "http" | "https" | "socks4" | "socks5" | "unknown";

// Advanced latency metrics for Pro Mode
export interface DetailedLatencyMetrics {
  dnsLookupTime: number;
  tcpConnectTime: number;
  tlsHandshakeTime: number;
  proxyConnectTime: number;
  proxyAuthTime: number;
  requestSendTime: number;
  responseWaitTime: number;
  responseDownloadTime: number;
  totalTime: number;
  isFirstConnection: boolean;
  sessionReused: boolean;
  connectionNumber: number;
}

// Pro Mode test result
export interface ProModeTestResult {
  proxy: string;
  status: ProxyStatus;
  protocol: ProxyProtocol;
  connections: DetailedLatencyMetrics[];
  averageMetrics: DetailedLatencyMetrics;
  firstConnectionTime: number;
  subsequentConnectionTime: number;
  exitIp?: string;
  geolocation?: {
    country?: string;
    countryCode?: string;
    city?: string;
    isp?: string;
  };
  errorDetails?: {
    code?: string;
    message: string;
    statusCode?: number;
    suggestion?: string;
    protocolsTried?: ProxyProtocol[];
  };
}

// Connection pool management
export interface ConnectionPoolConfig {
  maxConnections: number;
  keepAliveTimeout: number;
  connectionTimeout: number;
  reuseConnections: boolean;
}

export interface NormalizedProxy {
  formatted: string;
  protocol: ProxyProtocol;
}

export interface ProxyResult {
  raw: string;
  formatted: string;
  status: ProxyStatus;
  protocol: ProxyProtocol;
  // Optional fields
  latency?: number;
  ip?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  city?: string;
}

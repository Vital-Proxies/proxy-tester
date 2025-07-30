export enum ProxyFormat {
  IP_PORT = "ip:port",
  USER_PASS_AT_IP_PORT = "user:pass@ip:port",
  UNKNOWN = "unknown",
}

export type ProxyStatus = "ok" | "fail" | "unknown";

export type TestStatus = "idle" | "testing" | "stopping" | "finished";

export type Proxy = {
  raw: string;
  formatted: string;
  status: ProxyStatus;
  protocol: ProxyProtocol;
  latency?: number;
  simpleData: SimpleDetails | null;
  proDetails: ProDetails | null;
  error: ProxyError | null;
};

export type ProxyError = {
  code?: string;
  message: string;
  statusCode?: number;
  suggestion?: string;
  protocolsTried?: ProxyProtocol[];
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

export type SimpleModeOptions = {
  ipLookup: boolean;
  latencyCheck: boolean;
};

export type ProModeOptions = {
  connectionsPerProxy: number;
  testAllConnections: boolean;
  detailedMetrics: boolean;
  connectionPooling: boolean;
  retryCount: number;
  customTimeout: number;
  ipLookup?: boolean; // Add this for consistency
};

export type ProxyTesterOptions = {
  targetUrl: string;
  activeMode: "simple" | "pro";
  simpleMode: SimpleModeOptions;
  proMode: ProModeOptions;
};

export type ProxyProtocol = "http" | "https" | "socks4" | "socks5" | "unknown";

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

export interface SimpleDetails {
  country: string;
  countryCode: string;
  ip: string;
  isp: string;
  city: string;
}

export interface ProDetails {
  connections: DetailedLatencyMetrics[];
  averageMetrics: DetailedLatencyMetrics;
  firstConnectionTime: number;
  subsequentConnectionTime: number;
  connectionsCount: number;
  detailedMetrics: DetailedLatencyMetrics;
}

export interface NormalizedProxy {
  formatted: string;
  protocol: ProxyProtocol;
}

// Additional interface for internal use in the low-level tester
export interface ConnectionSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
  protocol: ProxyProtocol;
  proxy: string;
  lastUsed: number;
  requestCount: number;
  isAlive: boolean;
}

export interface SocketTimings {
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

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
};

export type ProxyProtocol = "http" | "https" | "socks4" | "socks5" | "unknown";

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

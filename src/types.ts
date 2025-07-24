export enum ProxyFormat {
  IP_PORT = "ip:port",
  USER_PASS_AT_IP_PORT = "user:pass@ip:port",
  UNKNOWN = "unknown",
}

export type ProxyStatus = "pending" | "testing" | "ok" | "fail";
export type TestStatus = "idle" | "testing" | "stopping" | "finished";
export type ProxyStreamResult = Omit<Proxy, "status"> & {
  status: "ok" | "fail";
};

export type Proxy = {
  raw: string;
  formatted: string;
  status: ProxyStatus;
  ip?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  city?: string;
  latency?: number;
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

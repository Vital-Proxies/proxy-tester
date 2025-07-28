import fetch from "node-fetch";
import { ProxyProtocol, ProxyStatus, ProxyTesterOptions } from "@/types";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

export async function testProxyWithProtocol(
  proxyFormatted: string,
  protocol: ProxyProtocol,
  options: ProxyTesterOptions,
  controller: AbortController
): Promise<{
  success: boolean;
  latency?: number;
  geoData?: any;
  status?: ProxyStatus;
  errorDetails?: any;
  errorMessage?: string;
}> {
  const startTime = performance.now();
  let agent: any;

  try {
    // Create appropriate agent based on protocol
    const agentOptions = {
      rejectUnauthorized: false,
      timeout: options.customTimeout || 15000,
    };
    
    switch (protocol) {
      case "http":
        agent = new HttpsProxyAgent(`http://${proxyFormatted}`, agentOptions);
        break;
      case "https":
        agent = new HttpsProxyAgent(`https://${proxyFormatted}`, agentOptions);
        break;
      case "socks4":
        agent = new SocksProxyAgent(`socks4://${proxyFormatted}`, agentOptions);
        break;
      case "socks5":
        agent = new SocksProxyAgent(`socks5://${proxyFormatted}`, agentOptions);
        break;
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }

    const timeout = options.customTimeout || 15000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await fetch(options.targetUrl, {
        agent,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      
      const ttfbTime = performance.now();
      const latency = options.latencyCheck
        ? Math.round(ttfbTime - startTime)
        : undefined;

      if (!response.ok) {
        return {
          success: false,
          status: "fail",
          errorMessage: `HTTP ${response.status} - ${response.statusText}`,
        };
      }

      await response.text();

      // Get geo data if requested
      let geoData: any = {};
      if (options.ipLookup) {
        try {
          const ipResponse = await fetch("https://ipinfo.io/json", {
            agent,
            signal: abortController.signal,
          });
          if (ipResponse.ok) {
            const data = (await ipResponse.json()) as any;
            geoData = {
              ip: data.ip,
              country: data.country,
              countryCode: data.country,
              city: data.city,
              isp: data.org,
            };
          }
        } catch (ipError) {
          // Geo lookup failed, but proxy works
        }
      }

      return { success: true, latency, geoData };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    let errorMessage = "Unknown error";
    
    if (error.name === 'AbortError') {
      errorMessage = "Connection timeout";
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = "Connection refused by proxy";
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = "Connection timeout";
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = "Proxy host not found";
    } else if (error.code === 'ECONNRESET') {
      errorMessage = "Connection reset by proxy";
    } else if (error.code === 'EPROTO' || error.code === 'EPROTONOSUPPORT') {
      errorMessage = "Protocol error - wrong proxy type?";
    } else if (error.message?.includes('authentication')) {
      errorMessage = "Authentication failed";
    } else if (error.message?.includes('tunneling socket could not be established')) {
      errorMessage = "Proxy connection failed";
    } else if (error.message) {
      errorMessage = error.message.substring(0, 100); // Limit message length
    }
    
    console.error(`Proxy test failed for ${proxyFormatted} (${protocol}):`, error.message);
    
    return {
      success: false,
      status: "fail",
      errorMessage,
    };
  }
}

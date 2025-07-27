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
}> {
  const startTime = performance.now();
  let agent: any;

  try {
    // Create appropriate agent based on protocol
    switch (protocol) {
      case "http":
        agent = new HttpsProxyAgent(`http://${proxyFormatted}`);
        break;
      case "https":
        agent = new HttpsProxyAgent(`https://${proxyFormatted}`);
        break;
      case "socks4":
        agent = new SocksProxyAgent(`socks4://${proxyFormatted}`);
        break;
      case "socks5":
        agent = new SocksProxyAgent(`socks5://${proxyFormatted}`);
        break;
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }

    const signal = AbortSignal.timeout(15000);

    const response = await fetch(options.targetUrl, {
      agent,
      signal,
    });

    const ttfbTime = performance.now();
    const latency = options.latencyCheck
      ? Math.round(ttfbTime - startTime)
      : undefined;

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      return {
        success: false,
        status: "fail",
      };
    }

    await response.text();

    // Get geo data if requested
    let geoData: any = {};
    if (options.ipLookup) {
      try {
        const ipResponse = await fetch("https://wtfismyip.com/json", {
          agent,
          signal: controller.signal,
        });
        if (ipResponse.ok) {
          const data = (await ipResponse.json()) as any;
          geoData = {
            ip: data["YourFuckingIPAddress"],
            country: data["YourFuckingCountry"],
            countryCode: data["YourFuckingCountryCode"],
            isp: data["YourFuckingISP"],
            city: data["YourFuckingCity"],
          };
        }
      } catch (ipError) {
        // Geo lookup failed, but proxy works
      }
    }

    return { success: true, latency, geoData };
  } catch (error: any) {
    return {
      success: false,
      status: "fail",
    };
  }
}

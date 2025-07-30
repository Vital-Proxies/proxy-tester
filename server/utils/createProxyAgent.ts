import { Proxy, ProxyProtocol } from "@/types";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

export default function createProxyAgent(
  proxy: Proxy,
  protocol: ProxyProtocol
) {
  switch (protocol) {
    case "http":
      return new HttpsProxyAgent(`http://${proxy.formatted}`);
    case "https":
      return new HttpsProxyAgent(`https://${proxy.formatted}`);
    case "socks4":
      return new SocksProxyAgent(`socks4://${proxy.formatted}`);
    case "socks5":
      return new SocksProxyAgent(`socks5://${proxy.formatted}`);
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

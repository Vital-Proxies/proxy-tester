import fetch from "node-fetch";
import { SimpleDetails, Proxy, ProxyProtocol } from "@/types";
import createProxyAgent from "./createProxyAgent";
import got from "got";

const IP_LOOKUP_URL = "https://wtfismyip.com/json";

export default async function IpLookup(
  proxy: Proxy,
  workingProtocol: ProxyProtocol,
  controller: AbortController
): Promise<SimpleDetails | null> {
  let agent: any;

  try {
    agent = createProxyAgent(proxy, workingProtocol);
  } catch (error: any) {
    console.debug(
      `Failed to create proxy agent for IP lookup: ${error.message}`
    );
    return null;
  }

  try {
    const response = await got(IP_LOOKUP_URL, {
      agent: {
        http: agent,
        https: agent,
      },
      signal: controller.signal,
    });

    if (response.statusCode !== 200) {
      console.debug(`IP lookup failed with status code ${response.statusCode}`);
      return null;
    }

    const json = JSON.parse(response.body);

    const geodata = json as {
      YourFuckingIPAddress: string;
      YourFuckingISP: string;
      YourFuckingCountry: string;
      YourFuckingCountryCode: string;
      YourFuckingCity: string;
    };
    return {
      country: geodata.YourFuckingCountry,
      countryCode: geodata.YourFuckingCountryCode,
      ip: geodata.YourFuckingIPAddress,
      isp: geodata.YourFuckingISP,
      city: geodata.YourFuckingCity,
    };
  } catch (error: any) {
    console.debug("IP lookup failed:", error.message);
    return null;
  }
}

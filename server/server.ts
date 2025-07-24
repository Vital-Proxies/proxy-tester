import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { Request, Response } from "express";
import { HttpsProxyAgent } from "https-proxy-agent";
import { performance } from "perf_hooks";

interface ProxyResult {
  raw: string;
  formatted: string;
  status: "ok" | "fail";
  latency?: number;
  ip?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  city?: string;
}

interface ProxyCheckOptions {
  proxies: {
    formatted: string;
    raw: string;
  }[];
  latencyCheck: boolean;
  ipLookup: boolean;
  targetUrl: string;
}

async function checkProxy(
  proxy: { formatted: string; raw: string },
  options: Pick<ProxyCheckOptions, "latencyCheck" | "ipLookup" | "targetUrl">
): Promise<ProxyResult> {
  let ttfb: number | undefined;
  let totalLatency: number | undefined;

  const startTime = performance.now();
  const proxyUrl = `http://${proxy.formatted}`;
  const agent = new HttpsProxyAgent(proxyUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(options.targetUrl, {
      agent,
      signal: controller.signal,
    });
    const ttfbTime = performance.now();
    ttfb = options.latencyCheck ? Math.round(ttfbTime - startTime) : undefined;
    if (!response.ok) throw new Error(`Status ${response.status}`);
    await response.text();
    const endTime = performance.now();
    totalLatency = options.latencyCheck
      ? Math.round(endTime - startTime)
      : undefined;

    let geoData: Partial<ProxyResult> = {};
    if (options.ipLookup) {
      try {
        const ipResponse = await fetch("https://wtfismyip.com/json", {
          agent,
          signal: controller.signal,
        });
        if (ipResponse.ok) {
          const data = (await ipResponse.json()) as {
            YourFuckingIPAddress: string;
            YourFuckingCountry: string;
            YourFuckingCountryCode: string;
            YourFuckingISP: string;
            YourFuckingCity: string;
          };
          geoData = {
            ip: data["YourFuckingIPAddress"],
            country: data["YourFuckingCountry"],
            countryCode: data["YourFuckingCountryCode"],
            isp: data["YourFuckingISP"],
            city: data["YourFuckingCity"],
          };
        }
      } catch (ipError) {
        console.warn(`IP lookup failed for proxy: ${proxy.raw}`);
      }
    }
    return { ...proxy, status: "ok", latency: ttfb, ...geoData };
  } catch (error) {
    return { ...proxy, status: "fail" };
  } finally {
    clearTimeout(timeoutId);
  }
}

const app = express();
const port = 3001;

app.use(
  cors({
    origin: ["http://localhost:3000", "tauri://localhost"],
  })
);
app.use(express.json({ limit: "50mb" }));

app.post("/api/proxy-check", async (req: Request, res: Response) => {
  console.log("Received proxy check request via Express.");
  const { proxies, latencyCheck, ipLookup, targetUrl } =
    req.body as ProxyCheckOptions;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const concurrencyLimit = 10;
  const queue = [...proxies];

  res.on("close", () => {
    console.log("Client disconnected, stopping proxy check tasks.");
  });

  const runTask = async () => {
    while (queue.length > 0) {
      if (res.writableEnded) break;
      const proxy = queue.shift()!;
      const result = await checkProxy(proxy, {
        latencyCheck,
        ipLookup,
        targetUrl,
      });
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    }
  };

  const workers = Array(concurrencyLimit).fill(null).map(runTask);
  await Promise.all(workers);

  res.end();
});

app.listen(port, "127.0.0.1", () => {
  console.log(`✅ Express server listening on port ${port}`);
});

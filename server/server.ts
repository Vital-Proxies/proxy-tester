import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { Request, Response } from "express";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { performance } from "perf_hooks";
import { Proxy, ProxyProtocol, ProxyTesterOptions, ProxyResult } from "@/types";
import { testProxyWithProtocol } from "./utils/testWithProtocol";

async function checkProxy(
  proxy: Proxy,
  options: ProxyTesterOptions
): Promise<ProxyResult> {
  const controller = new AbortController();
  const protocolsTried: ProxyProtocol[] = [];

  try {
    // If protocol is known, test only that protocol
    if (proxy.protocol !== "unknown") {
      protocolsTried.push(proxy.protocol);
      const result = await testProxyWithProtocol(
        proxy.formatted,
        proxy.protocol,
        options,
        controller
      );

      if (result.success) {
        return {
          ...proxy,
          status: "ok",
          protocol: proxy.protocol,
          latency: result.latency,
          ...result.geoData,
        };
      } else {
        return {
          ...proxy,
          status: "fail",
          protocol: proxy.protocol,
        };
      }
    }

    // Protocol is unknown - try in order: http, https, socks5, socks4
    const protocolsToTry: ProxyProtocol[] = [
      "http",
      "https",
      "socks5",
      "socks4",
    ];
    let lastError: any = null;

    for (const protocol of protocolsToTry) {
      protocolsTried.push(protocol);
      const result = await testProxyWithProtocol(
        proxy.formatted,
        protocol,
        options,
        controller
      );

      if (result.success) {
        return {
          ...proxy,
          status: "ok",
          protocol,
          latency: result.latency,
          ...result.geoData,
        };
      }

      lastError = result;
    }

    // All protocols failed - return the last error with all protocols tried
    return {
      ...proxy,
      status: lastError?.status || "unknown_error",
    };
  } catch (error: any) {
    return {
      ...proxy,
      status: "fail",
    };
  } finally {
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
  const { proxies, options } = req.body as {
    proxies: Proxy[];
    options: ProxyTesterOptions;
  };

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
      const result = await checkProxy(proxy, options);
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

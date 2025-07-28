import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { Request, Response } from "express";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { performance } from "perf_hooks";
import { Proxy, ProxyProtocol, ProxyTesterOptions, ProxyResult } from "@/types";
import { testProxyWithProtocol } from "./utils/testWithProtocol";
import { proModeServerTester } from "./utils/proModeServer";

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
    origin: ["http://localhost:3000", "http://localhost:3001", "tauri://localhost"],
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

// Pro Mode testing endpoint
app.post("/test-proxy-pro", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { proxy, options } = req.body;
    
    if (!proxy || !options) {
      return res.status(400).json({ 
        error: "Missing required fields: proxy and options" 
      });
    }

    console.log(`🚀 Pro Mode testing proxy: ${proxy}`);
    
    const result = await proModeServerTester.testProxyProMode(proxy, options);
    
    console.log(`✅ Pro Mode test completed for ${proxy}:`, {
      status: result.status,
      connections: result.connections.length,
      firstConnTime: result.firstConnectionTime,
      avgTime: result.averageMetrics.totalTime
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Pro Mode test error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Pro Mode batch testing endpoint
app.post("/test-proxies-pro-batch", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { proxies, options, concurrencyLimit = 10 } = req.body;
    
    if (!Array.isArray(proxies) || !options) {
      res.write(`data: ${JSON.stringify({ error: "Invalid request format" })}\n\n`);
      return res.end();
    }

    console.log(`🚀 Pro Mode batch testing ${proxies.length} proxies with concurrency ${concurrencyLimit}`);

    const queue = [...proxies];
    
    const runProTask = async () => {
      while (queue.length > 0) {
        if (res.writableEnded) break;
        const proxy = queue.shift()!;
        
        try {
          const result = await proModeServerTester.testProxyProMode(proxy, options);
          res.write(`data: ${JSON.stringify(result)}\n\n`);
        } catch (error) {
          const errorResult = {
            proxy,
            status: 'fail',
            error: error instanceof Error ? error.message : 'Unknown error',
            testMethod: options.testMethod || 'advanced',
            connections: [],
            averageMetrics: {
              dnsLookupTime: 0,
              tcpConnectTime: 0,
              tlsHandshakeTime: 0,
              proxyConnectTime: 0,
              proxyAuthTime: 0,
              requestSendTime: 0,
              responseWaitTime: 0,
              responseDownloadTime: 0,
              totalTime: 0,
              isFirstConnection: false,
              sessionReused: false,
              connectionNumber: 0
            },
            firstConnectionTime: 0,
            subsequentConnectionTime: 0
          };
          res.write(`data: ${JSON.stringify(errorResult)}\n\n`);
        }
      }
    };

    const workers = Array(concurrencyLimit).fill(null).map(runProTask);
    await Promise.all(workers);

    res.end();
  } catch (error) {
    console.error("❌ Pro Mode batch test error:", error);
    res.write(`data: ${JSON.stringify({ error: "Batch test failed" })}\n\n`);
    res.end();
  }
});

// Pro Mode statistics endpoint
app.get("/pro-mode-stats", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Return Pro Mode capabilities and statistics
  const stats = {
    features: {
      detailedLatencyMetrics: true,
      multipleConnections: true,
      connectionPooling: true,
      sessionReuse: true,
      advancedProtocolDetection: true,
      retryMechanism: true,
      geoLocation: true
    },
    metrics: [
      'dnsLookupTime',
      'tcpConnectTime', 
      'tlsHandshakeTime',
      'proxyConnectTime',
      'proxyAuthTime',
      'requestSendTime',
      'responseWaitTime',
      'responseDownloadTime',
      'totalTime'
    ],
    testMethods: ['fetch', 'advanced', 'all'],
    protocols: ['http', 'https', 'socks4', 'socks5'],
    maxConcurrency: 50,
    maxConnectionsPerProxy: 10
  };

  res.json(stats);
});

app.listen(port, "127.0.0.1", () => {
  console.log(`✅ Express server listening on port ${port}`);
  console.log(`🚀 Pro Mode endpoints available:`);
  console.log(`   POST /test-proxy-pro - Single proxy advanced testing`);
  console.log(`   POST /test-proxies-pro-batch - Batch proxy advanced testing`);
  console.log(`   GET /pro-mode-stats - Pro Mode capabilities`);
});

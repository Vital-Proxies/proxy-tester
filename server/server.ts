import express from "express";
import cors from "cors";
import { Request, Response } from "express";
import { Proxy, ProxyTesterOptions } from "@/types";
import { testSimpleMode } from "./core/simple-proxy-test";
import {
  testProMode,
  getProModeStats,
  cleanupProMode,
} from "./core/pro-proxy-test";

const app = express();
const port = 3001;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "tauri://localhost",
    ],
  })
);
app.use(express.json({ limit: "50mb" }));

app.post("/proxy-check", async (req: Request, res: Response) => {
  const { proxies, options } = req.body as {
    proxies: Proxy[];
    options: ProxyTesterOptions;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const concurrencyLimit = options.activeMode === "pro" ? 3 : 10;
  let processedCount = 0;
  let isClientDisconnected = false;

  res.on("close", () => {
    console.log("Client disconnected, cleaning up...");
    isClientDisconnected = true;
    if (options.activeMode === "pro") {
      try {
        cleanupProMode();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }
  });

  try {
    console.log(
      `🚀 Starting to test ${proxies.length} proxies in ${options.activeMode} mode with concurrency ${concurrencyLimit}`
    );

    // Simple concurrency logic - process proxies in parallel
    const queue = [...proxies];
    let completedCount = 0;

    const runTask = async () => {
      while (queue.length > 0 && !isClientDisconnected) {
        const proxy = queue.shift()!;

        try {
          let result: Proxy;

          // Test single proxy based on mode
          if (options.activeMode === "pro") {
            result = await testProMode(proxy, options);
          } else {
            result = await testSimpleMode(proxy, options);
          }

          // Stream result immediately
          if (!isClientDisconnected) {
            res.write(`data: ${JSON.stringify(result)}\n\n`);
            completedCount++;
            processedCount++;

            console.log(
              `✅ ${options.activeMode.toUpperCase()} Mode - Completed proxy ${
                result.formatted
              } - Status: ${result.status} (${completedCount}/${
                proxies.length
              })`
            );
          }
        } catch (error) {
          if (!isClientDisconnected) {
            console.error(`❌ Error testing proxy ${proxy.formatted}:`, error);

            const errorResult: Proxy = {
              ...proxy,
              status: "fail",
              error: {
                message:
                  error instanceof Error ? error.message : "Unknown error",
                code: "UNEXPECTED_ERROR",
                suggestion: "Check proxy configuration and try again",
              },
            };

            res.write(`data: ${JSON.stringify(errorResult)}\n\n`);
            completedCount++;
            processedCount++;

            console.log(
              `❌ ${options.activeMode.toUpperCase()} Mode - Failed proxy ${
                proxy.formatted
              } - Error: ${errorResult.error?.message} (${completedCount}/${
                proxies.length
              })`
            );
          }
        }
      }
    };

    // Create worker tasks with limited concurrency
    const workers = Array(Math.min(concurrencyLimit, proxies.length))
      .fill(null)
      .map(runTask);

    await Promise.all(workers);

    if (!isClientDisconnected) {
      console.log(
        `🎉 All proxy tests completed. Processed: ${processedCount}/${proxies.length}`
      );
    }
  } catch (error) {
    console.error("Error in proxy testing:", error);
  } finally {
    if (!isClientDisconnected) {
      res.end();
    }

    // Always cleanup pro mode resources
    if (options.activeMode === "pro") {
      try {
        cleanupProMode();
      } catch (error) {
        console.error("Error during final cleanup:", error);
      }
    }
  }
});

// Get proxy tester statistics
app.get("/stats", (req: Request, res: Response) => {
  try {
    const stats = getProModeStats();
    res.json({
      timestamp: new Date().toISOString(),
      proModeStats: stats,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get stats",
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Cleanup endpoint
app.post("/cleanup", (req: Request, res: Response) => {
  try {
    cleanupProMode();
    res.json({
      status: "ok",
      message: "Resources cleaned up successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Cleanup failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);

  try {
    cleanupProMode();
    console.log("Pro mode resources cleaned up");
  } catch (error) {
    console.error("Error during shutdown cleanup:", error);
  }

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

app.listen(port, "127.0.0.1", () => {});

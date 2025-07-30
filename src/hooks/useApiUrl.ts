"use client";

import { useEffect, useRef, useCallback } from "react";
import { Command, Child } from "@tauri-apps/plugin-shell";
import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

const API_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;

// Return type of our universal fetch
type ApiResponse<T = any> = {
  status: number;
  statusText: string;
  ok: boolean;
  data: T;
};

export function useApi() {
  const childProcessRef = useRef<Child | null>(null);

  useEffect(() => {
    if (!isTauri()) {
      console.log("Web environment detected. Not supported.");
      return;
    }

    console.log("Tauri environment detected. Spawning sidecar server...");

    const startSidecar = async () => {
      try {
        console.log("Starting sidecar process...");
        const command = Command.sidecar("bin/server");

        command.stdout.on("data", (line) => {
          console.log(`[Server]: ${line}`);
          if (line.includes(`listening on port ${API_PORT}`)) {
            console.log("✅ Server is ready. API status set to connected.");
          }
        });

        command.stderr.on("data", (line) => {
          console.error(`[Server Error]: ${line}`);
        });

        const child = await command.spawn();
        childProcessRef.current = child;
        console.log(
          "Sidecar process spawned successfully with PID:",
          child.pid
        );
      } catch (error) {
        console.error("Failed to spawn sidecar process:", error);
      }
    };

    startSidecar();

    return () => {
      if (childProcessRef.current) {
        console.log("Tauri app closing. Terminating sidecar process...");
        childProcessRef.current.kill();
        childProcessRef.current = null;
      }
    };
  }, []);

  //Not really needed tbh
  const getUrl = useCallback((path: string): string => {
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_URL}${formattedPath}`;
  }, []);

  const fetch = useCallback((isTauri: boolean) => {
    return isTauri ? tauriFetch : window.fetch;
  }, []);
  return { getUrl, fetch };
}

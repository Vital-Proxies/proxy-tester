"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { normalizeProxy } from "@/lib/utils";
import { type Proxy } from "@/types";
import { Textarea } from "@/components/ui/textarea";

export default function PasteTab({
  setHeight,
}: {
  setHeight: (h: number) => void;
}) {
  const { replaceAllProxies, isLoading } = useProxyTesterStore();
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    setHeight(ref.current.scrollHeight);
  }, [text, setHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    startTransition(() => {
      const rawProxies = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const newProxies: Proxy[] = rawProxies
        .map((raw) => {
          const normalizedProxy = normalizeProxy(raw);
          if (!normalizedProxy) return null;

          const proxy: Proxy = {
            id: crypto.randomUUID(),
            raw: raw,
            protocol: normalizedProxy.protocol,
            formatted: normalizedProxy.formatted,
            simpleData: null,
            proDetails: null,
            error: null,
            status: "unknown" as const,
          };

          return proxy;
        })
        .filter((p): p is Proxy => p !== null);

      replaceAllProxies(newProxies);
    });
  };

  const validProxyCount = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed && normalizeProxy(trimmed);
  }).length;

  const totalLines = text.split("\n").filter((line) => line.trim()).length;

  return (
    <div ref={ref}>
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/20">
          <p className="text-sm text-blue-200">
            <span className="font-medium text-blue-100">Any format works.</span>{" "}
            HTTP, HTTPS, SOCKS4, SOCKS5 — all protocols supported.
          </p>
        </div>

        <Textarea
          onChange={handleChange}
          value={text}
          className="w-full h-[174px] resize-none border border-white/10 bg-white/5 p-4 placeholder:text-gray-400 text-white focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20"
          disabled={isLoading}
          placeholder={
            "Paste your proxies here (one per line):\n\n" +
            "user:pass@proxy.example.com:8080\n" +
            "socks5://user:pass@127.0.0.1:1080\n" +
            "192.168.1.1:3128\n" +
            "http://proxy-server.net:80"
          }
        />

        <div className="text-xs text-text-secondary px-1 flex items-center justify-start w-full">
          <div className="flex items-center space-x-1">
            <span>
              {totalLines} {totalLines === 1 ? "line" : "lines"} detected
            </span>
            <span>{totalLines > 0 && "•"}</span>

            {validProxyCount !== totalLines && (
              <span className="text-orange-300">{validProxyCount} valid</span>
            )}
            {validProxyCount === totalLines && validProxyCount > 0 && (
              <span className="text-green-300 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                All valid
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

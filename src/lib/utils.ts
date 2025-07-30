import { NormalizedProxy, Proxy, ProxyProtocol } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { isTauri } from "@tauri-apps/api/core";
import { twMerge } from "tailwind-merge";
import { openUrl } from "@tauri-apps/plugin-opener";
import { platform } from "@tauri-apps/plugin-os";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleOpenUrl(url: string) {
  if (isTauri()) {
    openUrl(url).catch(console.error);
  } else {
    // In web environment, use window.open
    window.open(url, "_blank");
  }
}

export function countryCodeToFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) {
    return "";
  }
  return String.fromCodePoint(
    isoCode.toUpperCase().charCodeAt(0) - 65 + 0x1f1e6,
    isoCode.toUpperCase().charCodeAt(1) - 65 + 0x1f1e6
  );
}

export function normalizeProxy(raw: string): NormalizedProxy | null {
  const trimmed = raw.trim();

  // Remove protocol prefix if present
  let protocol: ProxyProtocol = "unknown";
  let clean = trimmed;

  const protocolMatch = trimmed.match(/^(https?|socks[45]?):\/\//i);
  if (protocolMatch) {
    const detectedProtocol = protocolMatch[1].toLowerCase();
    switch (detectedProtocol) {
      case "http":
        protocol = "http";
        break;
      case "https":
        protocol = "https";
        break;
      case "socks4":
        protocol = "socks4";
        break;
      case "socks5":
      case "socks":
        protocol = "socks5";
        break;
      default:
        protocol = "http";
    }
    clean = trimmed.replace(/^[^:]+:\/\//i, "");
  }

  // user:pass@host:port
  const match1 = clean.match(/^([^:@\s]+):([^:@\s]*)@([a-zA-Z0-9.-]+):(\d+)$/);
  if (match1) {
    const [, user, pass, host, port] = match1;
    return {
      formatted: `${user}:${pass}@${host}:${port}`,
      protocol,
    };
  }

  // host:port:user:pass
  const match2 = clean.match(/^([a-zA-Z0-9.-]+):(\d+):([^:@\s]+):([^:@\s]+)$/);
  if (match2) {
    const [, host, port, user, pass] = match2;
    return {
      formatted: `${user}:${pass}@${host}:${port}`,
      protocol,
    };
  }

  // user:pass:host:port
  const match3 = clean.match(/^([^:@\s]+):([^:@\s]+):([a-zA-Z0-9.-]+):(\d+)$/);
  if (match3) {
    const [, user, pass, host, port] = match3;
    return {
      formatted: `${user}:${pass}@${host}:${port}`,
      protocol,
    };
  }

  // host:port (IP or domain)
  const match4 = clean.match(/^([a-zA-Z0-9.-]+):(\d+)$/);
  if (match4) {
    const [, host, port] = match4;
    return {
      formatted: `${host}:${port}`,
      protocol,
    };
  }

  // Unknown format
  console.log("Unknown or invalid proxy format:", raw);
  return null;
}

export async function extractRawStringsFromFile(
  file: File,
  fileExtension: string
): Promise<string[]> {
  const text = await file.text();
  let proxies: string[] = [];

  if (fileExtension === ".json") {
    try {
      const parsed = JSON.parse(text);
      proxies = Array.isArray(parsed)
        ? parsed.map((item) =>
            typeof item === "string" ? item : JSON.stringify(item)
          )
        : [text];
    } catch {
      proxies = text
        .split(/[\n\r,;]+/)
        .map((line) => line.trim())
        .filter(Boolean);
    }
  } else if (fileExtension === ".csv") {
    proxies = text.split(/[\n\r]+/).flatMap((line) =>
      line
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  } else {
    proxies = text
      .split(/[\n\r]+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return proxies;
}

export function convertRawStringsToProxy(raw: string[]): Proxy[] {
  return raw
    .map((raw) => {
      const normalizedProxy = normalizeProxy(raw);
      if (!normalizedProxy) return null;
      return {
        raw,
        protocol: normalizedProxy.protocol,
        formatted: normalizedProxy.formatted,
        simpleData: null,
        proDetails: null,
        error: null,
        status: "unknown" as const,
      } as Proxy;
    })
    .filter((p): p is Proxy => p !== null);
}

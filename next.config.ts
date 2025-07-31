import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagpedia.com",
      },
    ],
    unoptimized: true,
  },
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
};

export default nextConfig;

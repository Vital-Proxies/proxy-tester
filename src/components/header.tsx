"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import { ArrowRight, Zap } from "lucide-react";
import HeaderSocials from "./header-socials";
import { useProxyTesterStore } from "@/store/proxy";

export default function Header() {
  const { options, setOptions } = useProxyTesterStore();
  const isProMode = options.proMode || false;

  const handleOpenUrl = (url: string) => {
    if (isTauri()) {
      openUrl(url).catch(console.error);
    } else {
      window.open(url, '_blank');
    }
  };

  const toggleProMode = () => {
    setOptions({
      ...options,
      proMode: !isProMode,
      // Set pro mode defaults when enabling
      ...((!isProMode) && {
        connectionsPerProxy: 3,
        testAllConnections: true,
        detailedMetrics: true,
        connectionPooling: true,
        testMethod: 'advanced',
        retryCount: 1,
      })
    });
  };

  return (
    <header className="flex w-full items-center justify-between p-4 border-b border-white/10">
      <div className="flex items-center gap-4">
        <Image
          src="/brand/logo-icon.svg"
          alt="Vital Proxies Icon"
          width={48}
          height={48}
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-light tracking-wider text-text-secondary">
            Vital Proxies
          </h1>
          <p className="text-2xl font-medium tracking-wider text-foreground -mt-1">
            Tester
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <HeaderSocials />
      </div>
    </header>
  );
}

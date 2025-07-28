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

        {/* Pro Mode Toggle Button */}
        <Button
          onClick={toggleProMode}
          className={`group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-md px-4 font-medium transition-all duration-300 ${
            isProMode 
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25' 
              : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
          }`}
        >
          <span className="flex items-center">
            <Zap className={`mr-2 size-4 transition-all duration-300 ${
              isProMode ? 'text-yellow-300' : 'text-gray-400'
            }`} />
            Pro Mode
            {isProMode && (
              <span className="ml-2 inline-flex items-center rounded-full bg-yellow-400 px-1.5 py-0.5 text-xs font-medium text-purple-900">
                ON
              </span>
            )}
          </span>
        </Button>

        <Button
          className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-md bg-accent px-4 font-medium text-neutral-50 transition-all duration-300 hover:bg-accent/90"
          onClick={() =>
            handleOpenUrl(
              "https://www.vital-proxies.com/?utm_source=vital-tester&utm_medium=app&utm_campaign=buy-proxies"
            )
          }
        >
          <span className="flex items-center">
            Try Vital For Free
            <ArrowRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Button>
      </div>
    </header>
  );
}

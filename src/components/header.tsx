"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowRight } from "lucide-react";
import HeaderSocials from "./header-socials";

export default function Header() {
  const handleOpenUrl = (url: string) => {
    openUrl(url).catch(console.error);
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

"use client";

import { openUrl } from "@tauri-apps/plugin-opener";
import Image from "next/image";
import { Button } from "./ui/button";
import { Globe, Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const socialLinks = [
  {
    href: "https://www.vital-proxies.com/?utm_source=vital-tester&utm_medium=app&utm_campaign=buy-proxies",
    label: "Website",
    icon: <Globe className="size-4" />,
  },
  {
    href: "https://discord.com/invite/vital-proxies",
    label: "Discord",
    icon: (
      <Image src="/social/discord.svg" width={18} height={18} alt="Discord" />
    ),
  },
  {
    href: "https://t.me/vitalproxies",
    label: "Telegram",
    icon: (
      <Image src="/social/telegram.svg" width={18} height={18} alt="Telegram" />
    ),
  },
  {
    href: "https://github.com/vital-proxies/proxy-tester",
    label: "GitHub",
    icon: <Github className="size-4" />,
  },
];

export default function HeaderSocials() {
  const handleOpenUrl = (url: string) => {
    openUrl(url).catch(console.error);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 py-5">
        {socialLinks.map((link) => (
          <Tooltip key={link.href}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleOpenUrl(link.href)}
                variant="ghost"
                size="icon"
                aria-label={link.label}
              >
                {link.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{link.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

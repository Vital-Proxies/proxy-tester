"use client";

import { useState, useTransition } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { normalizeProxy } from "@/lib/utils";
import { type Proxy } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function ProxyPasteBox() {
  const { replaceAllProxies, isLoading } = useProxyTesterStore();

  const [text, setText] = useState("");

  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    startTransition(() => {
      const rawProxies = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const newProxies: Proxy[] = rawProxies
        .map((raw, index) => {
          const formatted = normalizeProxy(raw);
          if (!formatted) return null;
          return {
            position: index,
            raw,
            formatted,
            status: "pending",
          } as Proxy;
        })
        .filter((p): p is Proxy => p !== null);

      replaceAllProxies(newProxies);
    });
  };

  return (
    <div className="relative">
      <Textarea
        onChange={handleChange}
        value={text}
        className="h-[200px] w-full resize-none border border-white/5 p-4 placeholder:text-text-text-secondary"
        disabled={isLoading}
        placeholder={
          "Here are some example formats:\n" +
          "- user:pass@host:port\n" +
          "- user:pass:host:port\n" +
          "- host:port:user:pass\n" +
          "- host:port\n" +
          "- All the above formats with or without a protocol prefix (http://, https://, socks5://, etc.)\n"
        }
      />
      {isPending && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { useProxyTesterStore } from "@/store/proxy";
import { motion } from "framer-motion";
import clsx from "clsx";

export default function ModeToggleSwitch({ enableTooltip = true }) {
  const { options, setOptions } = useProxyTesterStore();

  const setMode = (mode: "simple" | "pro") => {
    setOptions({ activeMode: mode });
  };

  return (
    <div className="relative bg-white/5 backdrop-blur-3xl overflow-hidden rounded-full h-10 border border-white/10 w-full p-[3px]">
      {/* Buttons */}
      <div className="flex items-center gap-2 h-full w-full relative z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={clsx("flex-1 z-10", {
                  "text-white": options.activeMode === "simple",
                })}
                variant="ghost"
                size="sm"
                onClick={() => setMode("simple")}
              >
                Simple
              </Button>
            </TooltipTrigger>
            {enableTooltip && (
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <div className="font-medium text-white">Simple Mode</div>
                  <div className="text-white/70">Fast basic proxy testing</div>
                  <div className="text-white/50 mt-1">• Quick validation</div>
                  <div className="text-white/50">• Basic latency check</div>
                  <div className="text-white/50">• Geographic data</div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={clsx("flex-1 z-10", {
                  "text-white": options.activeMode === "pro",
                })}
                variant="ghost"
                size="sm"
                onClick={() => setMode("pro")}
              >
                Pro
              </Button>
            </TooltipTrigger>
            {enableTooltip && (
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <div className="font-medium text-white">Pro Mode</div>
                  <div className="text-white/70">Comprehensive analysis</div>
                  <div className="text-white/50 mt-1">• Detailed metrics</div>
                  <div className="text-white/50">• Multiple connections</div>
                  <div className="text-white/50">• Performance profiling</div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Animated sliding indicator with full padding inside container */}
      <motion.div
        layout
        initial={false}
        animate={{
          left: options.activeMode === "simple" ? "3px" : "calc(50% + 3px)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={
          "absolute top-[3px] bottom-[3px] w-[calc(50%-6px)] backdrop-blur-3xl rounded-full bg-white/10"
        }
      />
    </div>
  );
}

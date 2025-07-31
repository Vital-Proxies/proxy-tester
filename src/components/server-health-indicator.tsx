"use client";

import { useApi } from "@/hooks/useApiUrl";
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ServerHealthIndicator() {
  const { getUrl, fetch } = useApi();
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch(isTauri())(getUrl("/health"), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("Server health check response:", response);

        if (response.status === 200) {
          setHealthy(true);
        } else {
          toast.error("Backend server is unreachable", {
            description:
              "Try restarting the app or make sure nothing is running on port 3001.",
          });
          setHealthy(false);
        }
      } catch (error) {
        setHealthy(false);
      }
    };
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 10000);
    return () => clearInterval(interval);
  }, [fetch, getUrl]);

  const getStatusConfig = () => {
    if (healthy === null) {
      return {
        icon: Loader2,
        color: "text-slate-400",
        bgColor: "bg-slate-500/20",
        glowColor: "shadow-slate-500/30",
        pulseColor: "bg-slate-400",
        title: "Checking server health...",
        description: "Performing health check",
        dotColor: "bg-slate-400",
      };
    }

    if (healthy) {
      return {
        icon: Wifi,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/20",
        glowColor: "shadow-emerald-500/40",
        pulseColor: "bg-emerald-400",
        title: "Server Connected",
        description: "All systems operational",
        dotColor: "bg-emerald-400",
      };
    }

    return {
      icon: WifiOff,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      glowColor: "shadow-red-500/40",
      pulseColor: "bg-red-400",
      title: "Server Disconnected",
      description: "Unable to reach backend",
      dotColor: "bg-red-400",
    };
  };

  const status = getStatusConfig();
  const IconComponent = status.icon;

  // Animation variants
  const containerVariants = {
    hover: {
      scale: 1.05,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    },
    tap: {
      scale: 0.95,
      transition: {
        type: "spring" as const,
        stiffness: 600,
        damping: 30,
      },
    },
  };

  const glowVariants = {
    initial: { scale: 1, opacity: 0.5 },
    hover: {
      scale: 1.2,
      opacity: 0.8,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
      },
    },
  };

  const iconVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.1,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    },
    loading: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear" as const,
      },
    },
  };

  const pulseVariants = {
    initial: { scale: 0.8, opacity: 0.2 },
    animate: {
      scale: [0.8, 1.2, 0.8],
      opacity: [0.2, 0.4, 0.2],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  const dotVariants = {
    initial: { scale: 0 },
    animate: {
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 25,
        delay: 0.2,
      },
    },
    pulse: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  const tooltipVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 10,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
      },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 25,
      },
    },
  };

  const shimmerVariants = {
    initial: { x: "-100%", skewX: -12 },
    animate: {
      x: "200%",
      transition: {
        duration: 1.5,
        ease: "easeInOut" as const,
      },
    },
  };

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Main Indicator */}
            <motion.div
              className="relative cursor-pointer"
              variants={containerVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {/* Glow Effect */}
              <motion.div
                className={`absolute inset-0 rounded-full blur-md ${status.glowColor} shadow-lg`}
                variants={glowVariants}
                initial="initial"
                whileHover="hover"
              />

              {/* Glass Container */}
              <motion.div
                className={`relative w-10 h-10 rounded-full backdrop-blur-xl border border-white/20 ${status.bgColor} shadow-xl overflow-hidden`}
                whileHover={{
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  transition: { duration: 0.3 },
                }}
              >
                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    variants={iconVariants}
                    initial="initial"
                    whileHover="hover"
                    animate={healthy === null ? "loading" : "initial"}
                  >
                    <IconComponent
                      className={`w-4 h-4 ${status.color}`}
                      strokeWidth={2}
                    />
                  </motion.div>
                </div>

                {/* Shimmer Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0"
                  variants={shimmerVariants}
                  initial="initial"
                  whileHover="animate"
                />
              </motion.div>

              {/* Floating particles effect for connected state */}
              <AnimatePresence>
                {healthy === true && (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-emerald-400/40 rounded-full"
                        initial={{
                          x: 28,
                          y: 28,
                          scale: 0,
                          opacity: 0,
                        }}
                        animate={{
                          x: [28, 28 + Math.cos(i * 120) * 20, 28],
                          y: [28, 28 + Math.sin(i * 120) * 20, 28],
                          scale: [0, 1, 0],
                          opacity: [0, 0.6, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.5,
                          ease: "easeInOut" as const,
                        }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </TooltipTrigger>

          <TooltipContent side="top" align="end">
            <div className="space-y-1">
              <div className="font-medium text-sm">{status.title}</div>
              <div className="text-white/70 text-xs">{status.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

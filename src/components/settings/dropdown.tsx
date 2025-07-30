"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { TooltipProvider } from "../ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import SimpleModeSettings from "./simple";
import ProModeSettings from "./pro";
import { Button } from "../ui/button";
import ModeToggleSwitch from "../mode-toggle-switch";

const TABS = [
  { id: "simple", label: "Simple" },
  { id: "pro", label: "Pro" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 15 : -15,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 15 : -15,
    opacity: 0,
  }),
};

export default function SettingsDropdown() {
  const { options, setOptions } = useProxyTesterStore();
  const [showSettings, setShowSettings] = useState(false);
  const [[activeTabIndex, direction], setActiveTab] = useState([0, 0]);
  const [contentHeight, setContentHeight] = useState(0);
  const [dropdownHeight, setDropdownHeight] = useState<number | "auto">("auto");
  const settingsRef = useRef<HTMLDivElement>(null);

  const activeTabId = TABS[activeTabIndex].id;

  const handleTabChange = (newTabIndex: number) => {
    const oldTabIndex = activeTabIndex;
    setActiveTab([newTabIndex, newTabIndex > oldTabIndex ? 1 : -1]);
  };

  // Calculate dropdown height when content height changes
  useEffect(() => {
    if (showSettings && contentHeight > 0) {
      const headerHeight = 93;
      const contentPadding = 48;
      const tabsHeight = 52;
      const spacing = 16;

      const calculatedHeight =
        headerHeight + tabsHeight + spacing + contentHeight + contentPadding;
      setDropdownHeight(calculatedHeight);
    } else if (showSettings) {
      setDropdownHeight(200);
    } else {
      setDropdownHeight("auto");
    }
  }, [showSettings, contentHeight]);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOptions({ ...options, activeMode: activeTabId as "simple" | "pro" });
  }, [activeTabId, setOptions]);

  return (
    <>
      {/* Dark Background Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="relative" ref={settingsRef}>
          <Button
            variant={"transparent"}
            size={"lg"}
            className={showSettings ? "relative z-50" : ""}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings
              size={18}
              className={`transition-all duration-300 ${
                showSettings
                  ? "text-text-primary rotate-45"
                  : "text-text-secondary"
              }`}
            />
            <span className="text-sm font-medium">Settings</span>
          </Button>

          {/* Settings Dropdown */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  height: dropdownHeight,
                }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  opacity: { duration: 0.15 },
                  height: { type: "spring", stiffness: 350, damping: 30 },
                }}
                className="absolute top-full right-0 z-50 mt-2 w-[420px] overflow-hidden"
              >
                <div className="h-full rounded-2xl bg-[rgba(255,255,255,0.01)] border border-white/20 backdrop-blur-3xl overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-1">
                        <Settings className="text-accent" size={28} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Settings
                        </h3>
                        <p className="text-xs text-gray-400">
                          Testing parameters & options
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 px-6 py-3 custom-scrollbar min-h-0">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-4"
                    >
                      <TooltipProvider>
                        <div className="flex flex-col gap-6">
                          {/* Custom Mode Toggle */}
                          <ModeToggleSwitch enableTooltip={false} />

                          {/* Animated Settings Content */}
                          <div className="overflow-hidden mt-4">
                            <AnimatePresence
                              initial={false}
                              custom={direction}
                              mode="wait"
                            >
                              <motion.div
                                key={options.activeMode}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                  x: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30,
                                  },
                                  opacity: { duration: 0.15 },
                                }}
                              >
                                {options.activeMode === "simple" ? (
                                  <SimpleModeSettings
                                    setHeight={setContentHeight}
                                  />
                                ) : (
                                  <ProModeSettings
                                    setHeight={setContentHeight}
                                  />
                                )}
                              </motion.div>
                            </AnimatePresence>
                          </div>
                        </div>
                      </TooltipProvider>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Upload, FileText, Clipboard } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { useProxyTesterStore } from "@/store/proxy";
import {
  extractRawStringsFromFile,
  convertRawStringsToProxy,
} from "@/lib/utils";
import PasteTab from "./paste-tab";
import ImportTab from "./import-tab";
import LoadProxiesToggle from "./toggle";

const IMPORT_TABS = [
  { id: "paste", label: "Paste", icon: Clipboard },
  { id: "file", label: "File", icon: FileText },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 15 : -15, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 15 : -15,
    opacity: 0,
  }),
};

export default function LoadProxiesDropdown() {
  const { replaceAllProxies } = useProxyTesterStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [[activeTabIndex, direction], setActiveTab] = useState([0, 0]);
  const [contentHeight, setContentHeight] = useState(0);
  const [dropdownHeight, setDropdownHeight] = useState<number | "auto">("auto");
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTabId = IMPORT_TABS[activeTabIndex].id;

  const handleTabChange = (newTabIndex: number) => {
    const oldTabIndex = activeTabIndex;
    setActiveTab([newTabIndex, newTabIndex > oldTabIndex ? 1 : -1]);
  };

  // Calculate dropdown height when content height changes - FIXED to match Settings
  useEffect(() => {
    if (showDropdown && contentHeight > 0) {
      const headerHeight = 93;
      const contentPadding = 48;
      const tabsHeight = 52;
      const spacing = 16;

      const calculatedHeight =
        headerHeight + tabsHeight + spacing + contentHeight + contentPadding;
      setDropdownHeight(calculatedHeight);
    } else if (showDropdown) {
      setDropdownHeight(200);
    } else {
      setDropdownHeight("auto");
    }
  }, [showDropdown, contentHeight]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [".txt", ".csv", ".json"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      alert("Please upload a .txt, .csv, or .json file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      const rawString = await extractRawStringsFromFile(file, fileExtension);

      if (rawString.length === 0) {
        alert("No valid proxies found in the file");
        return;
      }

      const processessedProxies = convertRawStringsToProxy(rawString);

      if (processessedProxies.length === 0) {
        alert("No valid proxies found in the file");
        return;
      }

      replaceAllProxies(processessedProxies);
      setShowDropdown(false);
    } catch (e) {
      console.error("Error processing file:", e);
      alert("Error processing file. Please check the format and try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  return (
    <>
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="relative" ref={dropdownRef}>
          <Button
            size={"lg"}
            variant={"transparent"}
            onClick={() => setShowDropdown(!showDropdown)}
            className={showDropdown ? "relative z-50" : ""}
          >
            <Upload
              size={18}
              className={`transition-all duration-300 ${
                showDropdown ? "text-text-primary" : "text-text-secondary"
              }`}
            />
            <span className="text-sm font-medium">Load Proxies</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <AnimatePresence>
            {showDropdown && (
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
                  opacity: { duration: 0.4 },
                  height: { type: "spring", stiffness: 350, damping: 30 },
                }}
                className="absolute top-full right-0 z-50 mt-2 w-[500px] overflow-hidden"
              >
                <div className="h-full rounded-2xl bg-[rgba(255,255,255,0.01)] border border-white/20 backdrop-blur-3xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-1">
                        <Upload className="text-accent" size={28} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Add Proxies
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Paste your proxies directly from the clipboard by
                          pressing{" "}
                          <kbd className="px-2 py-1 bg-white/3 border border-white/15 rounded-md text-xs font-mono text-white backdrop-blur-sm">
                            ⌘ + V
                          </kbd>{" "}
                          anywhere in the app
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
                      <LoadProxiesToggle
                        active={activeTabId as "paste" | "file"}
                        setActive={(val) =>
                          handleTabChange(
                            IMPORT_TABS.findIndex((tab) => tab.id === val)
                          )
                        }
                      />

                      <div className="overflow-hidden mt-4">
                        <AnimatePresence
                          initial={false}
                          custom={direction}
                          mode="wait"
                        >
                          <motion.div
                            key={activeTabIndex}
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
                            {activeTabId === "paste" ? (
                              <PasteTab setHeight={setContentHeight} />
                            ) : (
                              <ImportTab
                                setHeight={setContentHeight}
                                isUploading={isUploading}
                                triggerFileUpload={triggerFileUpload}
                              />
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
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

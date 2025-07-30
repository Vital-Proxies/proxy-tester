"use client";

import { Clipboard, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import clsx from "clsx";

export default function LoadProxiesToggle({
  active,
  setActive,
}: {
  active: "paste" | "file";
  setActive: (val: "paste" | "file") => void;
}) {
  return (
    <div className="relative bg-white/5 backdrop-blur-3xl overflow-hidden rounded-full h-10 border border-white/10 w-full p-[3px] grid grid-cols-2">
      {/* Animated background */}
      <motion.div
        layout
        initial={false}
        animate={{
          left: active === "paste" ? "3px" : "calc(50% + 3px)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-[3px] bottom-[3px] w-[calc(50%-6px)] backdrop-blur-3xl rounded-full bg-white/10"
      />

      {/* Buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActive("paste")}
        className={clsx("z-10 flex items-center justify-center gap-2", {
          "text-white": active === "paste",
        })}
      >
        <Clipboard size={16} />
        Paste
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActive("file")}
        className={clsx("z-10 flex items-center justify-center gap-2", {
          "text-white": active === "file",
        })}
      >
        <FileText size={16} />
        File
      </Button>
    </div>
  );
}

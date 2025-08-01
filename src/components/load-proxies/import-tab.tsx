import { FileText, Upload } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";

// A component for the "File" tab content that measures and reports its height
export default function ImportTab({
  setHeight,
  isUploading,
  triggerFileUpload,
}: {
  setHeight: (h: number) => void;
  isUploading: boolean;
  triggerFileUpload: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  }, [setHeight]);

  return (
    <div ref={ref} className="space-y-4">
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-400/20">
        <p className="text-sm text-green-200">
          <span className="font-medium">Upload</span> a file containing your
          proxies. Supports .txt, .csv, and .json formats.
        </p>
      </div>

      <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/30 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-white/5 border border-white/10">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">
              {isUploading ? "Processing file..." : "Choose a file to upload"}
            </h4>
            <p className="text-sm text-gray-400">
              Supports TXT, CSV, and JSON files (max 10MB)
            </p>
          </div>
          <Button
            onClick={triggerFileUpload}
            disabled={isUploading}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white"
          >
            {isUploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                />
                Processing...
              </>
            ) : (
              <>
                <Upload size={16} className="mr-2" />
                Browse Files
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="text-xs text-text-muted space-y-1">
        <p>
          <span className="font-medium text-text-secondary">TXT:</span> One
          proxy per line
        </p>
        <p>
          <span className="font-medium text-text-secondary">CSV:</span>{" "}
          Comma-separated values
        </p>
        <p>
          <span className="font-medium text-text-secondary">JSON:</span> Array
          of proxy strings
        </p>
      </div>
    </div>
  );
}

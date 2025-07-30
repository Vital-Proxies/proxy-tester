import { useProxyTesterStore } from "@/store/proxy";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export default function TargetUrlInput() {
  const { options, setOptions } = useProxyTesterStore();
  const [targetUrl, setTargetUrl] = useState(options.targetUrl || "");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setTargetUrl(newUrl);
    setOptions({ targetUrl: newUrl });
  };

  function isValidStrictHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const isHttp =
        parsed.protocol === "http:" || parsed.protocol === "https:";
      const hasDoubleSlash =
        url.startsWith("http://") || url.startsWith("https://");
      return isHttp && hasDoubleSlash;
    } catch {
      return false;
    }
  }

  const handleBlur = () => {
    if (targetUrl && !isValidStrictHttpUrl(targetUrl)) {
      toast.error("The target URL is invalid", {
        description: "Please enter a valid URL with http:// or https://",
        duration: 3000,
      });
    }
  };

  return (
    <Input
      id="target-url"
      type="text"
      className="h-10 !bg-white/5 rounded-full backdrop-blur-3xl pl-4 w-52 text-white border-white/10 placeholder:text-text-secondary"
      value={targetUrl}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Enter target URL"
    />
  );
}

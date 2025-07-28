import ProxyList from "@/components/proxy-list";
import ProxyConfiguration from "@/components/proxy-configuration";
import ProxyPasteBox from "@/components/proxy-paste-box";
import ProxyToolbar from "@/components/proxy-toolbar";
import { BarChart2, Cog, Wand2 } from "lucide-react";

export default function Home() {
  return (
    <div className="w-full px-4 py-4">
      <div className="flex flex-col gap-4">
        {/* Top Section - Paste and Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Paste Proxies */}
          <div className="rounded-md border bg-white/5 backdrop-blur-3xl px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="text-accent" size={24} />
              <h3 className="text-xl font-medium text-text-primary">
                Paste Proxies
              </h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              <span className="text-accent">Paste</span> your proxy list below
              and we&apos;ll magically figure out the format for you.
            </p>
            <ProxyPasteBox />
          </div>

          {/* Configuration */}
          <div className="rounded-md border bg-white/5 backdrop-blur-3xl px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Cog className="text-accent" size={24} />
              <h3 className="text-xl font-medium text-text-primary">
                Configuration
              </h3>
            </div>
            <ProxyConfiguration />
          </div>
        </div>

        {/* Results Section */}
        <div className="rounded-md border bg-white/5 backdrop-blur-3xl px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="text-accent" size={28} />
            <h3 className="text-2xl font-medium text-text-primary">
              Results
            </h3>
          </div>
          <ProxyToolbar />
          <ProxyList />
        </div>
      </div>
    </div>
  );
}
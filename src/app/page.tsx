import ProxyList from "@/components/proxy-list";
import ProxyOptions from "@/components/proxy-options";
import ProxyPasteBox from "@/components/proxy-paste-box";
import ProxyToolbar from "@/components/proxy-toolbar";
import { BarChart2, Cog, Wand2 } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center">
      <div className="mt-6 flex w-full flex-col gap-3 lg:flex-row lg:items-start">
        <div className="w-full rounded-md border bg-white/5 backdrop-blur-3xl px-8 py-6">
          <div className="flex w-full justify-between items-center">
            <div className="flex gap-2 items-center">
              <BarChart2 className="text-accent" size={32} />
              <h3 className="text-4xl font-medium text-text-primary">
                Results
              </h3>
            </div>
          </div>

          <ProxyToolbar />
          <ProxyList />
        </div>

        <div className="sticky top-2 flex w-full flex-col gap-3 lg:w-[600px]">
          <div className="w-full rounded-md border bg-white/5 backdrop-blur-3xl px-8 py-6">
            <div className="flex w-full items-center gap-2">
              <Wand2 className="text-accent" size={32} />
              <h3 className="text-2xl font-medium text-text-primary">
                Paste Proxies
              </h3>
            </div>
            <p className="mt-6 text-sm text-text-secondary">
              <span className="text-accent">Paste</span> your proxy list below
              and we&apos;ll magically figure out the format for you.
            </p>
            <div className="mt-4">
              <ProxyPasteBox />
            </div>
          </div>
          <div className="h-max w-full rounded-md border bg-white/5 backdrop-blur-3xl px-8 py-6">
            <div className="flex w-full items-center gap-2">
              <Cog className="text-accent" size={28} />
              <h3 className="text-2xl font-medium text-text-primary">
                Configuration
              </h3>
            </div>
            <div className="mt-6">
              <ProxyOptions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

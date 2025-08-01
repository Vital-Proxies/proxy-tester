"use client";

import LoadProxiesDropdown from "@/components/load-proxies/dropdown";
import ModeToggleSwitch from "@/components/mode-toggle-switch";
import ProxyList from "@/components/results/table";
import ProxyToolbar from "@/components/results/toolbar";
import SettingsDropdown from "@/components/settings/dropdown";
import TargetUrlInput from "@/components/target-url-input";
import UpdateChecker from "@/components/updater/update-checker";
import { useGlobalPasteProxies } from "@/hooks/useGlobalPasteProxies";

export default function Home() {
  useGlobalPasteProxies();

  return (
    <div className="mt-6 flex w-full flex-col gap-6">
      <div className="flex w-full">
        <UpdateChecker />
      </div>
      <div className="w-full flex lg:items-center gap-6 items-start flex-col lg:flex-row justify-between">
        <div className="flex gap-2 w-1/2">
          <div className="w-64">
            <ModeToggleSwitch />
          </div>
          <TargetUrlInput />
        </div>

        <div className="flex items-center lg:justify-end gap-2 w-1/2 ">
          <LoadProxiesDropdown />
          <SettingsDropdown />
        </div>
      </div>

      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 shrink-0 px-5 py-4 ">
            <ProxyToolbar />
          </div>

          <div className="flex-1 overflow-hidden px-5 py-4 ">
            <div className="h-full overflow-y-auto">
              <ProxyList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

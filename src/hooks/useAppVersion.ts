"use client";

import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";

export default function useAppVersion() {
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      if (isTauri()) {
        const version = await getVersion();
        setAppVersion(version);
      } else {
        // In web environment, use a default version or get it from package.json
        setAppVersion("1.1.0");
      }
    };

    fetchVersion();
  }, []);

  return appVersion;
}

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
        setAppVersion("1.0.0");
      }
    };

    fetchVersion();
  }, []);

  return appVersion;
}

"use client";

import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

export default function useAppVersion() {
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      const version = await getVersion();
      setAppVersion(version);
    };

    fetchVersion();
  }, []);

  return appVersion;
}

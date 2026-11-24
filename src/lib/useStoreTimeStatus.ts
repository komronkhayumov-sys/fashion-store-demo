"use client";

import { useState, useEffect } from "react";
import { getStoreTimeStatus, StoreTimeStatus } from "./time";
import { Language } from "@/types";

export function useStoreTimeStatus(lang: Language = "uz"): StoreTimeStatus & { isHydrated: boolean } {
  const [isHydrated, setIsHydrated] = useState(false);
  const [status, setStatus] = useState<StoreTimeStatus>(() => getStoreTimeStatus(lang));

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsHydrated(true);
      setStatus(getStoreTimeStatus(lang));
    });

    const interval = setInterval(() => {
      setStatus(getStoreTimeStatus(lang));
    }, 30000); // Every 30 seconds

    return () => {
      cancelAnimationFrame(handle);
      clearInterval(interval);
    };
  }, [lang]);

  return {
    ...status,
    isHydrated,
  };
}

export default useStoreTimeStatus;

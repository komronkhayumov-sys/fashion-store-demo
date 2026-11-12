"use client";

import { useState, useEffect } from "react";
import { getStoreTimeStatus, StoreTimeStatus } from "./time";
import { Language } from "@/types";

export function useStoreTimeStatus(lang: Language = "uz"): StoreTimeStatus & { isHydrated: boolean } {
  const [isHydrated, setIsHydrated] = useState(false);
  const [status, setStatus] = useState<StoreTimeStatus>(() => getStoreTimeStatus(lang));

  useEffect(() => {
    setIsHydrated(true);
    // Recalculate immediately on client hydration using real Tashkent time
    setStatus(getStoreTimeStatus(lang));

    const interval = setInterval(() => {
      setStatus(getStoreTimeStatus(lang));
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [lang]);

  return {
    ...status,
    isHydrated,
  };
}

export default useStoreTimeStatus;

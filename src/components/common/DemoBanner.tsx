"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Language } from "@/types";

interface DemoBannerProps {
  lang?: Language;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ lang = "uz" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const isUz = lang === "uz";

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("moda_demo_banner_dismissed");
      if (!dismissed) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem("moda_demo_banner_dismissed", "true");
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <aside aria-label="Demo notice" className="relative z-50 w-full bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white border-b border-indigo-500/30 text-xs shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-center gap-2 text-center text-[11px] sm:text-xs font-medium leading-tight">
          <span className="flex items-center gap-1.5 text-amber-300 font-bold shrink-0">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="hidden xs:inline">{isUz ? "DEMO PLATFORMA:" : "ДЕМО ПЛАТФОРМА:"}</span>
          </span>
          <span className="text-slate-200">
            {isUz
              ? "✨ Bu do'koningiz uchun tayyor onlayn savdo platformasi namunasi (Demo) — "
              : "✨ Готовая демо-платформа интернет-магазина для вашего бизнеса — "}
          </span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 shrink-0 border border-blue-400/40"
          >
            <span>{isUz ? "Admin panel: /admin" : "Админ-панель: /admin"}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title={isUz ? "Yopish" : "Закрыть"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};

export default DemoBanner;

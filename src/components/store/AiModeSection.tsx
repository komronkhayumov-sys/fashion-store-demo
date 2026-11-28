"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Bot,
  Send,
  RotateCcw,
  Check,
  Copy,
  ShoppingBag,
  ChevronRight,
  Ruler,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Language, Product, StoreSettings } from "@/types";
import { formatUzbekCurrency } from "@/lib/format";

interface AiModeSectionProps {
  products: Product[];
  lang: Language;
  settings?: StoreSettings | null;
  onAddToCart: (product: Product, size?: string, color?: string, quantity?: number) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateToProfile?: () => void;
  onNavigateToProducts?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  recommendedProductIds?: string[];
}

type BodyType = "slim" | "regular" | "broad";
type FitPref = "fitted" | "regular" | "oversize";
type SizeMode = "apparel" | "shoes";
type MobileTab = "chat" | "size";

function computeApparelSize(height: number, weight: number, bodyType: BodyType, fit: FitPref) {
  const hM = height / 100;
  let adjusted = weight / (hM * hM);
  if (bodyType === "slim") adjusted -= 1.2;
  if (bodyType === "broad") adjusted += 1.8;
  if (fit === "oversize") adjusted += 1.4;
  if (fit === "fitted") adjusted -= 0.7;

  let apparel = "L";
  let suit = "50";
  let pants = "32-33";
  let accuracy = 97;

  if (adjusted < 20.5) {
    apparel = "S";
    suit = "46";
    pants = "29-30";
    accuracy = 95;
  } else if (adjusted < 23.0) {
    apparel = "M";
    suit = "48";
    pants = "31-32";
    accuracy = 98;
  } else if (adjusted < 26.0) {
    apparel = "L";
    suit = "50";
    pants = "32-33";
    accuracy = 97;
  } else if (adjusted < 28.5) {
    apparel = "XL";
    suit = "52";
    pants = "34-35";
    accuracy = 96;
  } else if (adjusted < 31.5) {
    apparel = "2XL";
    suit = "54";
    pants = "36";
    accuracy = 94;
  } else {
    apparel = "3XL";
    suit = "56";
    pants = "38";
    accuracy = 93;
  }

  if (height >= 190 && apparel === "M") {
    apparel = "L";
    suit = "50";
  } else if (height >= 190 && apparel === "L") {
    apparel = "XL";
    suit = "52";
  }

  return { apparel, suit, pants, accuracy };
}

function computeShoeEu(footCm: number): number {
  if (footCm <= 24.3) return 38;
  if (footCm <= 24.9) return 39;
  if (footCm <= 25.7) return 40;
  if (footCm <= 26.5) return 41;
  if (footCm <= 27.3) return 42;
  if (footCm <= 28.2) return 43;
  if (footCm <= 29.0) return 44;
  return 45;
}

export const AiModeSection: React.FC<AiModeSectionProps> = ({
  products,
  lang,
  settings,
  onSelectProduct,
}) => {
  const isUz = lang === "uz";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const storeDisplayName = settings?.storeName || "MODA UZ";

  // Interactive Size Finder states
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [sizeMode, setSizeMode] = useState<SizeMode>("apparel");
  const [height, setHeight] = useState<number>(178);
  const [weight, setWeight] = useState<number>(75);
  const [bodyType, setBodyType] = useState<BodyType>("regular");
  const [fitPref, setFitPref] = useState<FitPref>("regular");
  const [footCm, setFootCm] = useState<number>(27.0);

  const sizeResult = useMemo(
    () => computeApparelSize(height, weight, bodyType, fitPref),
    [height, weight, bodyType, fitPref]
  );
  const shoeResult = useMemo(() => computeShoeEu(footCm), [footCm]);

  const buildGreeting = () =>
    isUz
      ? `Assalomu alaykum! Men **${storeDisplayName}** do'konining **AI Yordamchisi**man 🤖\n\n` +
        `Sizga ikkita asosiy yo'nalishda yordam beraman:\n` +
        `• 📏 **O'lchamlarni aniqlash:** Bo'yingiz, vazningiz yoki oyoq uzunligingizga ko'ra aniq kiyim va poyabzal razmerini hisoblash\n` +
        `• 🏬 **Do'kon haqida ma'lumot:** Filiallar manzili, ish vaqti, yetkazib berish shartlari, to'lov turlari va mahsulotlar narxi\n\n` +
        `Savolingizni yozing yoki tezkor tugmalardan birini bosing!`
      : `Здравствуйте! Я **AI Помощник** магазина **${storeDisplayName}** 🤖\n\n` +
        `Чем я могу вам помочь:\n` +
        `• 📏 **Подбор размера:** Точный расчет размера одежды и обуви по вашим параметрам\n` +
        `• 🏬 **Вопросы о магазине:** Адреса филиалов, график работы, доставка, оплата и наличие товаров\n\n` +
        `Напишите ваш вопрос или выберите готовый вариант ниже!`;

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-init",
      sender: "bot",
      text: buildGreeting(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isBotTyping]);

  useEffect(() => {
    setChatMessages((prev) => {
      if (prev.length === 1 && prev[0].id.startsWith("msg-init")) {
        return [{ ...prev[0], text: buildGreeting() }];
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, storeDisplayName]);

  const quickPrompts = [
    {
      emoji: "📏",
      titleUz: "Bo'yim 178 sm, vaznim 75 kg — qaysi o'lcham?",
      titleRu: "Рост 178 см, вес 75 кг — какой размер?",
    },
    {
      emoji: "👟",
      titleUz: "Oyoq uzunligim 27 sm — nechanchi razmer?",
      titleRu: "Длина стопы 27 см — какой размер обуви?",
    },
    {
      emoji: "📍",
      titleUz: "Filiallar manzili va ish vaqti qanday?",
      titleRu: "Адреса филиалов и режим работы?",
    },
    {
      emoji: "🚚",
      titleUz: "Yetkazib berish narxi va muddati qancha?",
      titleRu: "Стоимость и сроки доставки?",
    },
    {
      emoji: "💳",
      titleUz: "Qanday to'lov usullari bor? (Click, Payme)",
      titleRu: "Какие есть способы оплаты?",
    },
    {
      emoji: "🔄",
      titleUz: "Razmer to'g'ri kelmasa almashtirsa bo'ladimi?",
      titleRu: "Можно ли обменять, если размер не подойдет?",
    },
    {
      emoji: "🛍️",
      titleUz: "Katalogdagi mahsulotlar va narxlar",
      titleRu: "Товары в наличии и цены",
    },
    {
      emoji: "📞",
      titleUz: "Do'kon telefoni va Telegram / Instagram",
      titleRu: "Контакты магазина и соцсети",
    },
  ];

  const detectRecommendedProducts = (replyText: string, responseSize?: string, shoeSize?: string): Product[] => {
    const available = products.filter((p) => p.isAvailable !== false);
    const lower = replyText.toLowerCase();

    if (shoeSize) {
      const shoes = available.filter(
        (p) => p.category === "shoes" && (p.sizes.includes(shoeSize) || p.sizes.length > 0)
      );
      if (shoes.length > 0) return shoes.slice(0, 3);
    }

    if (responseSize) {
      const norm = responseSize.split(" ")[0].trim();
      const matchingBySize = available.filter((p) => p.sizes.includes(norm));
      if (matchingBySize.length > 0) return matchingBySize.slice(0, 3);
    }

    return available
      .filter((p) => {
        const nameUz = p.name.toLowerCase();
        const nameRu = (p.nameRu || "").toLowerCase();
        return (
          lower.includes(nameUz) ||
          (nameRu && lower.includes(nameRu)) ||
          (nameUz.includes("kardigan") && lower.includes("kardigan")) ||
          (nameUz.includes("bomber") && lower.includes("bomber")) ||
          (nameUz.includes("jinsi") && lower.includes("jinsi")) ||
          (nameUz.includes("chinos") && lower.includes("chinos")) ||
          (nameUz.includes("lofer") && lower.includes("lofer")) ||
          (nameUz.includes("krossovka") && lower.includes("krossovka"))
        );
      })
      .slice(0, 3);
  };

  const handleSendMessage = async (
    customText?: string,
    overridePayload?: Partial<{
      type: "chat" | "size_recommendation";
      height: number;
      weight: number;
      bodyType: BodyType;
      fitPreference: FitPref;
      footCm: number;
    }>
  ) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || isBotTyping) return;

    setMobileTab("chat");

    const userMessage: ChatMessage = {
      id: `usr-${Math.random().toString(36).substring(2, 9)}`,
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (!customText) setChatInput("");
    setIsBotTyping(true);

    try {
      const historyPayload = chatMessages
        .filter((m) => m.id !== "msg-init")
        .slice(-8)
        .map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

      const localGeminiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("moda_gemini_api_key") ||
            localStorage.getItem("button_gemini_api_key") ||
            settings?.geminiApiKey ||
            ""
          : settings?.geminiApiKey || "";

      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: overridePayload?.type || "chat",
          message: textToSend,
          height: overridePayload?.height,
          weight: overridePayload?.weight,
          bodyType: overridePayload?.bodyType,
          fitPreference: overridePayload?.fitPreference,
          footCm: overridePayload?.footCm,
          history: historyPayload,
          lang,
          geminiApiKey: localGeminiKey,
        }),
      });

      const data = await res.json();
      if (data.savedApiKey && typeof window !== "undefined") {
        localStorage.setItem("moda_gemini_api_key", data.savedApiKey);
      }

      const replyText =
        data.reply ||
        (isUz
          ? "Kechirasiz, so'rovingizni qayta ishlay olmadim. Iltimos, boshqacha tarzda yozib ko'ring."
          : "Извините, не удалось обработать запрос. Попробуйте переформулировать.");

      const matched = detectRecommendedProducts(replyText, data.size, data.shoeSize);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `bot-${Math.random().toString(36).substring(2, 9)}`,
          sender: "bot",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          recommendedProductIds: matched.map((p) => p.id),
        },
      ]);
    } catch {
      const fallbackPhone = settings?.phone1 || "+998 90 123 45 67";
      setChatMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Math.random().toString(36).substring(2, 9)}`,
          sender: "bot",
          text: isUz
            ? `Aloqada vaqtinchalik uzilish yuz berdi. Qaytadan urinib ko'ring yoki bizga qo'ng'iroq qiling: ${fallbackPhone}.`
            : `Временный сбой связи. Попробуйте еще раз или позвоните нам: ${fallbackPhone}.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleSendSizeToChat = () => {
    if (sizeMode === "shoes") {
      const prompt = isUz
        ? `Oyoq kaftim uzunligi ${footCm} sm — poyabzal o'lchamimni va mos modellarni ko'rsating`
        : `Длина стопы ${footCm} см — подберите размер обуви и подходящие модели`;
      handleSendMessage(prompt, {
        type: "size_recommendation",
        footCm,
      });
      return;
    }

    const prompt = isUz
      ? `Bo'yim ${height} sm, vaznim ${weight} kg — menga mos o'lcham va kiyimlarni aniqlab bering`
      : `Рост ${height} см, вес ${weight} кг — определите мой размер и подходящие товары`;
    handleSendMessage(prompt, {
      type: "size_recommendation",
      height,
      weight,
      bodyType,
      fitPreference: fitPref,
    });
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        id: `msg-reset-${Math.random().toString(36).substring(2, 9)}`,
        sender: "bot",
        text: buildGreeting(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleCopyText = (text: string, id: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderFormattedText = (raw: string) => {
    return raw.split("\n").map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-extrabold text-violet-700 dark:text-violet-300">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={pIdx} className="italic text-zinc-500 dark:text-zinc-400">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      return (
        <p key={idx} className={line.trim() === "" ? "h-2" : "leading-relaxed my-0.5"}>
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-12 animate-fade-in font-sans">
      {/* 1. AI Yordamchi Header */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-violet-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-bold tracking-wide">
              <Bot className="w-3.5 h-3.5 text-violet-300" />
              <span>{storeDisplayName.toUpperCase()} • {isUz ? "AI YORDAMCHI" : "AI ПОМОЩНИК"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              {isUz ? "AI Yordamchi & O'lcham Aniqlagich" : "AI Помощник и Подбор Размера"}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              {isUz
                ? "Bo'y, vazn va oyoq o'lchamingizga ko'ra aniq razmerni hisoblang hamda do'kon filiallari, yetkazib berish va narxlar haqida javob oling."
                : "Определите точный размер одежды и обуви по вашим параметрам и получите быстрые ответы на любые вопросы о магазине."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetChat}
            className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer active:scale-95 self-start sm:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isUz ? "Yangi suhbat" : "Новый диалог"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mobileTab === "chat"
              ? "bg-violet-700 text-white shadow-sm"
              : "text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isUz ? "Savol-javob (Chat)" : "Вопрос-ответ (Чат)"}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("size")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mobileTab === "size"
              ? "bg-violet-700 text-white shadow-sm"
              : "text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
          }`}
        >
          <Ruler className="w-4 h-4" />
          <span>{isUz ? "O'lchamni aniqlash" : "Определить размер"}</span>
        </button>
      </div>

      {/* 2. Dual Workspace: Size Determiner + Store FAQ Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Interactive Smart Size Determiner */}
        <div
          className={`lg:col-span-5 ${
            mobileTab === "size" ? "block" : "hidden lg:block"
          } rounded-3xl bg-white dark:bg-[#0f172a] border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-xl space-y-5`}
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 flex items-center justify-center">
                <Ruler className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="font-black text-sm sm:text-base text-[#0F172A] dark:text-white">
                  {isUz ? "O'lchamni aniqlash" : "Определить размер"}
                </h2>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                  {isUz ? "Kiyim, shim, kostyum va poyabzal" : "Одежда, брюки, костюмы и обувь"}
                </p>
              </div>
            </div>
          </div>

          {/* Category Toggle: Apparel vs Shoes */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setSizeMode("apparel")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sizeMode === "apparel"
                  ? "bg-white dark:bg-[#0f172a] text-violet-700 dark:text-violet-300 shadow-xs"
                  : "text-[#64748B] dark:text-slate-400"
              }`}
            >
              👕 {isUz ? "Kiyim & Shim" : "Одежда и брюки"}
            </button>
            <button
              type="button"
              onClick={() => setSizeMode("shoes")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sizeMode === "shoes"
                  ? "bg-white dark:bg-[#0f172a] text-violet-700 dark:text-violet-300 shadow-xs"
                  : "text-[#64748B] dark:text-slate-400"
              }`}
            >
              👞 {isUz ? "Poyabzal (sm)" : "Обувь (см)"}
            </button>
          </div>

          {sizeMode === "apparel" ? (
            <div className="space-y-4">
              {/* Height Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#475569] dark:text-slate-300">{isUz ? "Bo'yingiz:" : "Ваш рост:"}</span>
                  <span className="text-violet-700 dark:text-violet-400 font-mono text-base font-black">{height} sm</span>
                </div>
                <input
                  type="range"
                  min={155}
                  max={205}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                  <span>155 sm</span>
                  <span>180 sm</span>
                  <span>205 sm</span>
                </div>
              </div>

              {/* Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#475569] dark:text-slate-300">{isUz ? "Vazningiz:" : "Ваш вес:"}</span>
                  <span className="text-violet-700 dark:text-violet-400 font-mono text-base font-black">{weight} kg</span>
                </div>
                <input
                  type="range"
                  min={45}
                  max={135}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                  <span>45 kg</span>
                  <span>80 kg</span>
                  <span>135 kg</span>
                </div>
              </div>

              {/* Body Build */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#475569] dark:text-slate-300 block">
                  {isUz ? "Gavda tuzilishi:" : "Телосложение:"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "slim", uz: "Ixcham", ru: "Худощавое" },
                    { id: "regular", uz: "O'rtacha", ru: "Среднее" },
                    { id: "broad", uz: "Baquvvat", ru: "Плотное" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBodyType(b.id as BodyType)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        bodyType === b.id
                          ? "bg-violet-700 text-white border-violet-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300"
                      }`}
                    >
                      {isUz ? b.uz : b.ru}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fit Preference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#475569] dark:text-slate-300 block">
                  {isUz ? "Kiyim turishi:" : "Посадка:"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "fitted", uz: "Yopishgan", ru: "Приталенная" },
                    { id: "regular", uz: "Standart", ru: "Стандарт" },
                    { id: "oversize", uz: "Erkin", ru: "Свободная" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFitPref(f.id as FitPref)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        fitPref === f.id
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300"
                      }`}
                    >
                      {isUz ? f.uz : f.ru}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant Size Result Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 via-indigo-50/70 to-blue-50 dark:from-violet-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-violet-200 dark:border-violet-800/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-violet-700 dark:text-violet-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isUz ? "Sizning tavsiya o'lchamingiz" : "Рекомендуемый размер"}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {sizeResult.accuracy}% {isUz ? "aniqlik" : "точность"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0f172a] border border-violet-200/80 dark:border-slate-700">
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 font-semibold">
                      {isUz ? "Ustki kiyim" : "Верх"}
                    </span>
                    <span className="text-xl font-black font-mono text-violet-700 dark:text-violet-400">
                      {sizeResult.apparel}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0f172a] border border-violet-200/80 dark:border-slate-700">
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 font-semibold">
                      {isUz ? "Kostyum" : "Костюм"}
                    </span>
                    <span className="text-xl font-black font-mono text-[#0F172A] dark:text-white">
                      {sizeResult.suit}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0f172a] border border-violet-200/80 dark:border-slate-700">
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 font-semibold">
                      {isUz ? "Shim / Jinsi" : "Брюки"}
                    </span>
                    <span className="text-xl font-black font-mono text-[#0F172A] dark:text-white">
                      {sizeResult.pants}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#475569] dark:text-slate-300">
                    {isUz ? "Oyoq kafti uzunligi:" : "Длина стопы:"}
                  </span>
                  <span className="text-violet-700 dark:text-violet-400 font-mono text-base font-black">
                    {footCm.toFixed(1)} sm
                  </span>
                </div>
                <input
                  type="range"
                  min={24.0}
                  max={30.0}
                  step={0.5}
                  value={footCm}
                  onChange={(e) => setFootCm(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                  <span>24.0 sm</span>
                  <span>27.0 sm</span>
                  <span>30.0 sm</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 via-indigo-50/70 to-blue-50 dark:from-violet-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-violet-200 dark:border-violet-800/50 text-center space-y-2">
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300 block">
                  {isUz ? "Mos keluvchi poyabzal o'lchami:" : "Ваш размер обуви (EU):"}
                </span>
                <div className="inline-block px-6 py-2 rounded-2xl bg-violet-700 text-white font-black text-3xl font-mono shadow-md">
                  {shoeResult}
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {isUz
                    ? "Oq qog'ozga oyoq qo'yib, tovondan bosh barmoq uchigacha santimetrda o'lchab kiriting."
                    : "Поставьте ногу на лист бумаги и измерьте длину от пятки до кончика большого пальца."}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSendSizeToChat}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 hover:brightness-110 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-700/25 transition-all cursor-pointer active:scale-95"
          >
            <span>{isUz ? "Chatda mos mahsulotlarni ko'rish" : "Показать подходящие товары в чате"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* RIGHT COLUMN: AI Store Q&A Chat */}
        <div className={`lg:col-span-7 space-y-3 ${mobileTab === "chat" ? "block" : "hidden lg:block"}`}>
          {/* Quick Question Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                <span>{isUz ? "Tezkor savollar (1 bosishda javob):" : "Быстрые вопросы о магазине:"}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(isUz ? item.titleUz : item.titleRu)}
                  className="px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0f172a] hover:bg-violet-50 dark:hover:bg-violet-950/40 text-xs font-semibold text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-800 hover:border-violet-500/40 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs flex items-center gap-2 group active:scale-95"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">{item.emoji}</span>
                  <span>{isUz ? item.titleUz : item.titleRu}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Chat Card */}
          <div className="rounded-3xl bg-white dark:bg-[#0f172a] border border-[#E2E8F0] dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[540px] sm:h-[580px]">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {chatMessages.map((msg) => {
                const isBot = msg.sender === "bot";
                const recommendedProducts = msg.recommendedProductIds
                  ? products.filter((p) => msg.recommendedProductIds?.includes(p.id))
                  : [];

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 animate-fade-in ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    {isBot && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-violet-700 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-700/25 mt-0.5">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    )}

                    <div className={`space-y-2.5 max-w-[88%] sm:max-w-[82%] ${isBot ? "items-start" : "items-end"}`}>
                      <div
                        className={`p-4 rounded-3xl text-xs sm:text-sm shadow-xs relative ${
                          isBot
                            ? "bg-[#F8FAFC] dark:bg-[#1e293b]/90 text-[#0F172A] dark:text-slate-100 border border-[#E2E8F0] dark:border-slate-700/80 rounded-tl-sm"
                            : "bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 text-white rounded-tr-sm shadow-md shadow-violet-700/20"
                        }`}
                      >
                        {renderFormattedText(msg.text)}

                        {isBot ? (
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-[#94A3B8]">
                            <span className="font-mono text-[10px]">{msg.time}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="flex items-center gap-1 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">{isUz ? "Nusxalandi" : "Скопировано"}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{isUz ? "Nusxalash" : "Копировать"}</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end pt-1 text-[10px] text-violet-200 font-mono">
                            {msg.time}
                          </div>
                        )}
                      </div>

                      {isBot && recommendedProducts.length > 0 && (
                        <div className="p-3 rounded-2xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{isUz ? "Mos keluvchi mahsulotlar:" : "Подходящие товары:"}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {recommendedProducts.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => onSelectProduct(p)}
                                className="p-2 rounded-xl bg-white dark:bg-[#0f172a] border border-violet-100 dark:border-slate-800 flex items-center gap-2 hover:border-violet-500 transition-all cursor-pointer shadow-xs group"
                              >
                                <div className="w-10 h-10 rounded-lg relative overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                  <Image
                                    src={p.image}
                                    alt={p.name}
                                    fill
                                    unoptimized
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-[11px] font-bold text-[#0F172A] dark:text-white truncate">
                                    {isUz ? p.name : p.nameRu || p.name}
                                  </h4>
                                  <p className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold">
                                    {formatUzbekCurrency(p.price)}
                                  </p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-violet-600 transition-colors shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isBotTyping && (
                <div className="flex gap-3 items-center animate-fade-in">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-violet-700 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1e293b] border border-[#E2E8F0] dark:border-slate-700 flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                      {isUz ? "AI Yordamchi javob tayyorlamoqda" : "AI Помощник готовит ответ"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 sm:p-4 bg-slate-50/90 dark:bg-slate-900/90 border-t border-[#E2E8F0] dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isUz
                      ? "O'lcham yoki do'kon haqida savol yozing (masalan: bo'yim 180, vaznim 76)..."
                      : "Спросите о размере или магазине (например: рост 180, вес 76)..."
                  }
                  className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#1e293b] border border-[#E2E8F0] dark:border-slate-700 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-violet-600 shadow-xs"
                />

                <button
                  type="submit"
                  disabled={isBotTyping || !chatInput.trim()}
                  className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-violet-700/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{isUz ? "Yuborish" : "Отправить"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AiAssistantSection = AiModeSection;
export default AiModeSection;

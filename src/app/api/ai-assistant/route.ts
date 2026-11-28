import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, getProducts, verifyPin } from "@/lib/storage";
import { Product, StoreSettings } from "@/types";

export type AssistantRequest = {
  message?: string;
  type?: "chat" | "size_recommendation";
  height?: number;
  weight?: number;
  bodyType?: "slim" | "regular" | "broad";
  fitPreference?: "fitted" | "regular" | "oversize";
  footCm?: number;
  category?: string;
  lang?: "uz" | "ru";
  geminiApiKey?: string;
  history?: Array<{ sender: "user" | "bot"; text: string }>;
};

type SizeCalculation = {
  apparelSize: string;
  suitSize: string;
  pantsSize: string;
  matchRate: number;
  adviceUz: string;
  adviceRu: string;
};

/**
 * Shared men's apparel/suit/pants size calculator synchronized with SmartSizeCalculator logic.
 */
function calculateMenSize(
  height: number,
  weight: number,
  bodyType: "slim" | "regular" | "broad" = "regular",
  fitPreference: "fitted" | "regular" | "oversize" = "regular"
): SizeCalculation {
  const hM = height / 100;
  let adjustedBmi = weight / (hM * hM);

  if (bodyType === "slim") adjustedBmi -= 1.2;
  if (bodyType === "broad") adjustedBmi += 1.8;
  if (fitPreference === "oversize") adjustedBmi += 1.4;
  if (fitPreference === "fitted") adjustedBmi -= 0.7;

  let apparelSize = "L";
  let suitSize = "50";
  let pantsSize = "32-33";
  let matchRate = 97;

  if (adjustedBmi < 20.5) {
    apparelSize = "S";
    suitSize = "46";
    pantsSize = "29-30";
    matchRate = 95;
  } else if (adjustedBmi < 23.0) {
    apparelSize = "M";
    suitSize = "48";
    pantsSize = "31-32";
    matchRate = 98;
  } else if (adjustedBmi < 26.0) {
    apparelSize = "L";
    suitSize = "50";
    pantsSize = "32-33";
    matchRate = 97;
  } else if (adjustedBmi < 28.5) {
    apparelSize = "XL";
    suitSize = "52";
    pantsSize = "34-35";
    matchRate = 96;
  } else if (adjustedBmi < 31.5) {
    apparelSize = "2XL";
    suitSize = "54";
    pantsSize = "36";
    matchRate = 94;
  } else {
    apparelSize = "3XL";
    suitSize = "56";
    pantsSize = "38";
    matchRate = 93;
  }

  // Tall frame sleeve & length safeguard
  if (height >= 190 && apparelSize === "M") {
    apparelSize = "L";
    suitSize = "50";
  } else if (height >= 190 && apparelSize === "L") {
    apparelSize = "XL";
    suitSize = "52";
  }

  const adviceUz =
    `Bo'yingiz **${height} sm** va vazningiz **${weight} kg** ko'rsatkichlariga ko'ra sizga mos o'lchamlar:\n\n` +
    `• 👕 **Ustki kiyim (polo, futbolka, sviter, kardigan, kurtka):** **${apparelSize}**\n` +
    `• 👔 **Klassik kostyum / pidjak:** **${suitSize}**\n` +
    `• 👖 **Shim va jinsilar:** **${pantsSize}**\n\n` +
    `✅ Bichim aniqligi: **${matchRate}%**.\n` +
    `💡 *Maslahat:* Agar kiyim biroz erkinroq turishini xohlasangiz, bir pog'ona katta o'lcham tanlashingiz mumkin.`;

  const adviceRu =
    `По вашему росту **${height} см** и весу **${weight} кг** вам подойдут следующие размеры:\n\n` +
    `• 👕 **Верх (поло, футболка, свитер, кардиган, куртка):** **${apparelSize}**\n` +
    `• 👔 **Классический костюм / пиджак:** **${suitSize}**\n` +
    `• 👖 **Брюки и джинсы:** **${pantsSize}**\n\n` +
    `✅ Точность подбора: **${matchRate}%**.\n` +
    `💡 *Совет:* Если предпочитаете свободную посадку (oversize), рекомендуем взять на размер больше.`;

  return { apparelSize, suitSize, pantsSize, matchRate, adviceUz, adviceRu };
}

/**
 * Shoe EU size calculator from foot length in centimeters.
 */
function calculateShoeSize(footCm: number): { euSize: number; adviceUz: string; adviceRu: string } {
  const table = [
    { maxCm: 24.3, eu: 38 },
    { maxCm: 24.9, eu: 39 },
    { maxCm: 25.7, eu: 40 },
    { maxCm: 26.5, eu: 41 },
    { maxCm: 27.3, eu: 42 },
    { maxCm: 28.2, eu: 43 },
    { maxCm: 29.0, eu: 44 },
    { maxCm: 31.0, eu: 45 },
  ];
  const row = table.find((item) => footCm <= item.maxCm) || table[table.length - 1];

  const adviceUz =
    `👟 Oyoq kafti uzunligi **${footCm} sm** uchun tavsiya etiladigan poyabzal o'lchami: **${row.eu} (EU)**.\n\n` +
    `📏 **O'lchov jadvali:**\n` +
    `• 24.5 sm → **39** | 25.5 sm → **40** | 26.5 sm → **41**\n` +
    `• 27.0 sm → **42** | 28.0 sm → **43** | 29.0 sm → **44**\n\n` +
    `💡 *Maslahat:* Krossovka yoki qishki etik olayotganda 0.5 sm zaxira (yarim razmer kattaroq) qulayroq bo'ladi.`;

  const adviceRu =
    `👟 Для длины стопы **${footCm} см** рекомендуемый размер обуви: **${row.eu} (EU)**.\n\n` +
    `📏 **Таблица размеров:**\n` +
    `• 24.5 см → **39** | 25.5 см → **40** | 26.5 см → **41**\n` +
    `• 27.0 см → **42** | 28.0 см → **43** | 29.0 см → **44**\n\n` +
    `💡 *Совет:* Для кроссовок и ботинок лучше оставлять небольшой запас 0.5 см.`;

  return { euSize: row.eu, adviceUz, adviceRu };
}

function extractHeightAndWeight(text: string): { height?: number; weight?: number } | null {
  const clean = text.toLowerCase();
  const hwMatch = clean.match(
    /(?:bo['`’]?y(?:im)?\s*[:=]?\s*(\d{2,3})|(\d{2,3})\s*(?:sm|см))\s*.*?(?:vazn(?:im)?\s*[:=]?\s*(\d{2,3})|(\d{2,3})\s*(?:kg|кг))/i
  );
  let height: number | undefined;
  let weight: number | undefined;

  if (hwMatch) {
    height = Number(hwMatch[1] || hwMatch[2]);
    weight = Number(hwMatch[3] || hwMatch[4]);
  } else {
    const pairMatch = clean.match(/\b(1[4-9]\d|2[0-2]\d)\s*(?:sm|см)?\s*[\/,;|\-\s]+\s*(\d{2,3})\s*(?:kg|кг)?\b/);
    if (pairMatch) {
      height = Number(pairMatch[1]);
      weight = Number(pairMatch[2]);
    }
  }

  if (height && weight && height >= 140 && height <= 225 && weight >= 40 && weight <= 180) {
    return { height, weight };
  }
  return null;
}

function extractSingleHeight(text: string): number | null {
  const clean = text.toLowerCase();
  const match =
    clean.match(/(?:bo['`’]?y(?:im)?|rost|рост)\s*[:=]?\s*(\d{2,3})/i) ||
    clean.match(/\b(1[4-9]\d|2[0-2]\d)\s*(?:sm|см)\b/i);
  if (match) {
    const val = Number(match[1]);
    if (val >= 140 && val <= 225) return val;
  }
  if (/^\s*(1[4-9]\d|2[0-2]\d)\s*$/.test(clean)) {
    return Number(clean.trim());
  }
  return null;
}

function extractSingleWeight(text: string): number | null {
  const clean = text.toLowerCase();
  const match =
    clean.match(/(?:vazn(?:im)?|ves|вес)\s*[:=]?\s*(\d{2,3})/i) ||
    clean.match(/\b(\d{2,3})\s*(?:kg|кг)\b/i);
  if (match) {
    const val = Number(match[1]);
    if (val >= 40 && val <= 180) return val;
  }
  if (/^\s*(\d{2,3})\s*$/.test(clean)) {
    const val = Number(clean.trim());
    if (val >= 40 && val <= 139) return val;
  }
  return null;
}

function extractFootLengthCm(text: string): number | null {
  const clean = text.toLowerCase().replace(",", ".");
  const match = clean.match(/\b(2[3-9](?:\.\d)?|30(?:\.\d)?)\s*(?:sm|см)\b/);
  if (match) {
    const val = Number(match[1]);
    if (val >= 23 && val <= 31) return val;
  }
  return null;
}

function findMatchingProducts(inStockProducts: Product[], query: string): Product[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9а-яё'`’]+/i)
    .filter((w) => w.length >= 3);

  if (tokens.length === 0) return [];

  return inStockProducts
    .filter((p) => {
      const hay = `${p.name} ${p.nameRu || ""} ${p.description} ${p.category}`.toLowerCase();
      return tokens.some((tok) => hay.includes(tok));
    })
    .slice(0, 5);
}

function formatDeliveryInfo(settings: StoreSettings, isUz: boolean): string {
  const tashFee = settings.deliveryPriceTashkent ?? 25000;
  const tashFree = settings.deliveryFreeThresholdTashkent ?? 500000;
  const regFee = settings.deliveryPriceRegions ?? 40000;
  const regFree = settings.deliveryFreeThresholdRegions ?? 1000000;

  if (isUz) {
    return (
      `🚚 **Yetkazib berish (Dostavka) shartlari:**\n\n` +
      `• 🏙️ **Toshkent shahri bo'ylab:** **${tashFee.toLocaleString("uz-UZ")} so'm** (${tashFree.toLocaleString("uz-UZ")} so'mdan yuqori xaridlarga — **BEPUL!**). Muddati: 1–3 soat ichida kuryer orqali.\n` +
      `• 📦 **Viloyatlarga:** **${regFee.toLocaleString("uz-UZ")} so'm** (${regFree.toLocaleString("uz-UZ")} so'mdan yuqori xaridlarga — **BEPUL!**). Muddati: 1–2 ish kunida.\n` +
      `• 🏬 **Filialdan olib ketish:** Do'konimizga kelib kiyib ko'rgan holda bepul olib ketishingiz mumkin.\n\n` +
      `Saytdan buyurtma berishingiz bilan ma'lumotlar darhol Telegram menejerimizga yetib boradi.`
    );
  }
  return (
    `🚚 **Условия доставки:**\n\n` +
    `• 🏙️ **По Ташкенту:** **${tashFee.toLocaleString("ru-RU")} сум** (при заказе от ${tashFree.toLocaleString("ru-RU")} сум — **БЕСПЛАТНО!**). Доставка за 1–3 часа.\n` +
    `• 📦 **По регионам Узбекистана:** **${regFee.toLocaleString("ru-RU")} сум** (от ${regFree.toLocaleString("ru-RU")} сум — **БЕСПЛАТНО!**). Срок: 1–2 рабочих дня.\n` +
    `• 🏬 **Самовывоз из филиала:** Бесплатно, с удобной примеркой на месте.`
  );
}

export async function POST(req: NextRequest) {
  try {
    const body: AssistantRequest = await req.json();
    const lang = body.lang || "uz";
    const isUz = lang === "uz";
    const userMessage = body.message?.trim() || "";
    const lowerMsg = userMessage.toLowerCase();

    // Admin Gemini API key activation shortcut
    const apiKeyMatch = userMessage.match(/\b(AIzaSy[A-Za-z0-9_-]{33})\b/);
    if (apiKeyMatch) {
      const detectedKey = apiKeyMatch[1];
      const pinHeader = req.headers.get("x-admin-pin") || "";
      const isAdmin = await verifyPin(pinHeader);
      if (isAdmin) {
        try {
          await saveSettings({ geminiApiKey: detectedKey });
        } catch (e) {
          console.warn("Could not save Gemini key:", e);
        }
      }
      return NextResponse.json({
        success: true,
        reply: isUz
          ? `✅ **Google Gemini API kaliti ulandi!**\n\nAI Yordamchi jonli rejimda ishlashga tayyor.`
          : `✅ **Ключ Google Gemini API подключен!**\n\nAI Помощник готов к работе в реальном времени.`,
        savedApiKey: isAdmin ? detectedKey : undefined,
        provider: "gemini-activated",
      });
    }

    // 1. Direct interactive Size Recommendation request
    if (body.type === "size_recommendation") {
      if (body.footCm !== undefined) {
        const footCm = Number(body.footCm);
        if (isNaN(footCm) || footCm < 21 || footCm > 33) {
          return NextResponse.json(
            {
              success: false,
              error: isUz
                ? "Oyoq uzunligi 21–33 sm oralig'ida bo'lishi kerak"
                : "Длина стопы должна быть от 21 до 33 см",
            },
            { status: 400 }
          );
        }
        const shoe = calculateShoeSize(footCm);
        return NextResponse.json({
          success: true,
          reply: isUz ? shoe.adviceUz : shoe.adviceRu,
          shoeSize: String(shoe.euSize),
        });
      }

      const height = Number(body.height);
      const weight = Number(body.weight);
      if (isNaN(height) || isNaN(weight) || height < 100 || height > 250 || weight < 30 || weight > 250) {
        return NextResponse.json(
          {
            success: false,
            error: isUz
              ? "Bo'y (100-250 sm) va vazn (30-250 kg) oralig'ida bo'lishi kerak"
              : "Рост (100-250 см) и вес (30-250 кг) должны быть в допустимом диапазоне",
          },
          { status: 400 }
        );
      }

      const calc = calculateMenSize(height, weight, body.bodyType || "regular", body.fitPreference || "regular");
      return NextResponse.json({
        success: true,
        reply: isUz ? calc.adviceUz : calc.adviceRu,
        size: calc.apparelSize,
        suitSize: calc.suitSize,
        pantsSize: calc.pantsSize,
        matchRate: calc.matchRate,
      });
    }

    // 2. Foot length in cm -> Shoe EU size
    const footCm = extractFootLengthCm(lowerMsg);
    if (footCm) {
      const shoe = calculateShoeSize(footCm);
      return NextResponse.json({
        success: true,
        reply: isUz ? shoe.adviceUz : shoe.adviceRu,
        shoeSize: String(shoe.euSize),
      });
    }

    // 3. Height + Weight in current message or combined from previous user turns
    const extractedHW = extractHeightAndWeight(lowerMsg);
    if (extractedHW?.height && extractedHW?.weight) {
      const calc = calculateMenSize(extractedHW.height, extractedHW.weight);
      return NextResponse.json({
        success: true,
        reply: isUz ? calc.adviceUz : calc.adviceRu,
        size: calc.apparelSize,
      });
    }

    // Check recent conversation history if user gave height first, then weight (or vice versa)
    const prevUserTexts = Array.isArray(body.history)
      ? body.history.filter((h) => h.sender === "user").slice(-3).map((h) => h.text)
      : [];
    const currentH = extractSingleHeight(lowerMsg);
    const currentW = extractSingleWeight(lowerMsg);

    if (currentW && !currentH) {
      for (let i = prevUserTexts.length - 1; i >= 0; i--) {
        const prevH = extractSingleHeight(prevUserTexts[i]);
        if (prevH) {
          const calc = calculateMenSize(prevH, currentW);
          return NextResponse.json({
            success: true,
            reply: isUz ? calc.adviceUz : calc.adviceRu,
            size: calc.apparelSize,
          });
        }
      }
    }
    if (currentH && !currentW) {
      for (let i = prevUserTexts.length - 1; i >= 0; i--) {
        const prevW = extractSingleWeight(prevUserTexts[i]);
        if (prevW) {
          const calc = calculateMenSize(currentH, prevW);
          return NextResponse.json({
            success: true,
            reply: isUz ? calc.adviceUz : calc.adviceRu,
            size: calc.apparelSize,
          });
        }
      }
    }

    // 4. Load live Store Settings & Active Products
    const settings = await getSettings();
    const products = await getProducts();
    const inStockProducts = products.filter((p) => p.isAvailable !== false);
    const storeName = settings.storeName || "MODA UZ";
    const branches = settings.branches || [];

    const branchesList =
      branches.length > 0
        ? branches
            .map((b, i) => `${i + 1}. ${b.name}: ${b.address} (Mo'ljal: ${b.landmark}, Tel: ${b.phone})`)
            .join("\n")
        : isUz
        ? "Toshkent shahri"
        : "г. Ташкент";

    const catalogSummary = inStockProducts
      .slice(0, 25)
      .map(
        (p) =>
          `• ${p.name} — ${p.price.toLocaleString("uz-UZ")} so'm (O'lchamlar: ${p.sizes.join(", ")}, Kategoriya: ${p.category})`
      )
      .join("\n");

    // 5. Optional Live Gemini Integration
    const geminiKey =
      body.geminiApiKey?.trim() ||
      req.headers.get("x-gemini-key")?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      settings.geminiApiKey?.trim();

    if (geminiKey) {
      try {
        const tashFee = settings.deliveryPriceTashkent ?? 25000;
        const tashFree = settings.deliveryFreeThresholdTashkent ?? 500000;
        const regFee = settings.deliveryPriceRegions ?? 40000;
        const regFree = settings.deliveryFreeThresholdRegions ?? 1000000;

        const systemInstruction = `
Siz ${storeName} (${settings.storeHandle}) onlayn do'konining rasmiy AI Yordamchisisiz.
Sizning asosiy vazifangiz FAQAT ikkita yo'nalishda mijozlarga aniq va samimiy yordam berish:
1. O'lchamlarni aniqlash: bo'y (sm), vazn (kg), tana tuzilishi yoki oyoq uzunligiga (sm) ko'ra kiyim (S/M/L/XL/2XL/3XL), kostyum (46-56), shim (29-38) va poyabzal (38-45) o'lchamini aniq hisoblab berish.
2. Do'kon haqidagi xabarlar va savollarga javob berish: filiallar manzili, ish vaqti, telefon/Telegram/Instagram aloqasi, yetkazib berish narxlari va muddati, to'lov turlari, mahsulotlar mavjudligi, narxlari va o'lchamlari haqida aniq ma'lumot berish.

Qoidalar:
- O'zingizni "stilist" yoki "obraz tuzuvchi" deb atamang. Siz ${storeName} do'konining AI Yordamchisisiz.
- Do'kon haqidagi real ma'lumotlar:
  * Do'kon nomi: ${storeName} (${settings.storeHandle})
  * Ish vaqti: ${settings.workingHoursUz}
  * Telefonlar: ${settings.phone1}${settings.phone2 ? `, ${settings.phone2}` : ""}
  * Instagram: ${settings.instagramUrl} | Telegram: ${settings.telegramUrl}
  * Filiallar:\n${branchesList}
  * Yetkazib berish: Toshkent ${tashFee.toLocaleString("uz-UZ")} so'm (${tashFree.toLocaleString("uz-UZ")} so'mdan bepul, 1-3 soat), Viloyatlar ${regFee.toLocaleString("uz-UZ")} so'm (${regFree.toLocaleString("uz-UZ")} so'mdan bepul, 1-2 ish kuni).
  * To'lovlar: Click, Payme, Uzum Bank, Uzcard/Humo, Naqd pul. Karta: ${settings.cardNumber} (${settings.cardHolder}).
  * Almashtirish/Qaytarish: Kiyilmagan va birkasi saqlangan mahsulotni boshqa o'lchamga almashtirib berish mumkin.
- Mavjud mahsulotlar katalogi:
${catalogSummary}

Mijoz yozgan tilda (${isUz ? "o'zbek" : "rus"}) qisqa, tushunarli va do'stona javob bering.
`.trim();

        const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
        if (Array.isArray(body.history)) {
          for (const item of body.history) {
            if (item && item.text && typeof item.text === "string") {
              contents.push({
                role: item.sender === "user" ? "user" : "model",
                parts: [{ text: item.text }],
              });
            }
          }
        }
        contents.push({ role: "user", parts: [{ text: userMessage }] });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents,
                generationConfig: { maxOutputTokens: 700, temperature: 0.6 },
              }),
            }
          );
          clearTimeout(timeoutId);

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText && candidateText.trim().length > 10) {
              return NextResponse.json({
                success: true,
                reply: candidateText.trim(),
                provider: "gemini-generative",
              });
            }
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn("Gemini fetch timed out or failed:", fetchErr);
        }
      } catch (geminiError) {
        console.warn("Gemini error, using built-in assistant engine:", geminiError);
      }
    }

    // 6. Built-in Deterministic Size & Store Q&A Engine
    let reply = "";

    if (currentH) {
      const approxSuggestion =
        currentH >= 190
          ? isUz
            ? "Uzun bo'y uchun odatda **XL–2XL** ustki kiyim va **33–36** shimlar qulayroq bo'ladi."
            : "Для высокого роста обычно подходят **XL–2XL** верх и **33–36** брюки."
          : currentH >= 173
          ? isUz
            ? "Bu bo'y uchun vaznga qarab asosan **M, L yoki XL** o'lchamlar mos keladi."
            : "Для такого роста обычно подходят размеры **M, L или XL** в зависимости от веса."
          : isUz
          ? "Bu bo'y uchun asosan **S yoki M** (shimlar **29–31**) o'lchamlar yaxshi tushadi."
          : "Для этого роста обычно хорошо подходят **S или M** (брюки **29–31**).";

      reply = isUz
        ? `Bo'yingiz **${currentH} sm** ekanini belgiladim 📏\n\n${approxSuggestion}\n\nAniq o'lchamni hisoblashim uchun **vazningizni (kg)** ham yozib yuboring (masalan: *75 kg*). Yoki chap/yuqoridagi **"O'lchamni aniqlash"** bo'limidan slayder orqali ham hisoblashingiz mumkin.`
        : `Принято, ваш рост **${currentH} см** 📏\n\n${approxSuggestion}\n\nНапишите также ваш примерный **вес (кг)** (например: *75 кг*), чтобы я рассчитал точный размер.`;
    } else if (currentW) {
      const est = currentW < 65 ? "S–M" : currentW < 78 ? "M–L" : currentW < 92 ? "L–XL" : "2XL–3XL";
      reply = isUz
        ? `Vazningiz **${currentW} kg** uchun taxminiy o'lcham: **${est}** ⚖️\n\nAniq razmerni (yelka, kostyum va shim uzunligini) hisoblashim uchun **bo'yingizni (sm)** ham yozib yuboring (masalan: *178 sm*).`
        : `Для веса **${currentW} кг** примерный размер: **${est}** ⚖️\n\nНапишите также ваш **рост (см)** (например: *178 см*), чтобы я рассчитал точный размер.`;
    } else if (
      /poyabzal|oyoq|krossovka|lofer|etik|tufli|обув|стоп|кроссовк|лофер/i.test(lowerMsg) &&
      /razmer|o'lcham|olcham|размер|sm|см|qanday|aniq/i.test(lowerMsg)
    ) {
      reply = isUz
        ? `👟 **Poyabzal o'lchamini aniqlash qo'llanmasi:**\n\n` +
          `Oyoq kaftingizni oq qog'ozga qo'yib, tovondan bosh barmoq uchigacha santimetrda o'lchang:\n` +
          `• **24.5 sm** → **39** razmer\n` +
          `• **25.5 sm** → **40** razmer\n` +
          `• **26.5 sm** → **41** razmer\n` +
          `• **27.0 sm** → **42** razmer\n` +
          `• **28.0 sm** → **43** razmer\n` +
          `• **29.0 sm** → **44** razmer\n\n` +
          `Oyoq uzunligingizni yozing (masalan: *"27 sm"*) — aniq razmeringizni darhol aytib beraman!`
        : `👟 **Как определить размер обуви:**\n\n` +
          `Измерьте длину стопы от пятки до большого пальца в см:\n` +
          `• **24.5 см** → **39** | **25.5 см** → **40** | **26.5 см** → **41**\n` +
          `• **27.0 см** → **42** | **28.0 см** → **43** | **29.0 см** → **44**\n\n` +
          `Напишите длину вашей стопы (например: *"27 см"*), и я назову точный размер!`;
    } else if (/almashtir|qaytar|vozvrat|kafolat|sifat|обмен|возврат|гаранти/i.test(lowerMsg)) {
      reply = isUz
        ? `🔄 **Almashtirish va qaytarish tartibi:**\n\n` +
          `• Agar buyurtma qilingan kiyim yoki poyabzal o'lchami to'g'ri kelmasa, **kiyilmagan, yuvilmagan va yorlig'i (birkasi) saqlangan** holda 14 kun ichida boshqa mos o'lchamga almashtirib beramiz.\n` +
          `• Almashtirish uchun bog'lanish: **${settings.phone1}**`
        : `🔄 **Условия обмена и возврата:**\n\n` +
          `• Если размер не подошел, мы обменяем товар на подходящий в течение 14 дней при сохранении товарного вида и бирок.\n` +
          `• Контакт для обмена: **${settings.phone1}**`;
    } else if (/razmer|o'lcham|olcham|razmerim|размер|подобрать/i.test(lowerMsg)) {
      reply = isUz
        ? `📏 **Aniq o'lchamni aniqlash uchun:**\n\n` +
          `Menga **bo'yingiz (sm)** va **vazningizni (kg)** yozing — masalan: *"Bo'yim 178 sm, vaznim 75 kg"*.\n\n` +
          `Agar poyabzal razmeri kerak bo'lsa, oyoq uzunligini santimetrda yozing (*"27 sm"*). Shuningdek, **"O'lchamni aniqlash"** kalkulyatoridan slayderlar yordamida ham foydalanishingiz mumkin!`
        : `📏 **Чтобы точно определить ваш размер:**\n\n` +
          `Напишите ваш **рост (см)** и **вес (кг)** — например: *"Рост 178 см, вес 75 кг"*.\n` +
          `Для обуви укажите длину стопы в см (*"27 см"*). Вы также можете воспользоваться вкладкой **"Определить размер"**!`;
    } else if (/filial|qayerda|adres|joylash|manzil|lokatsiya|адрес|где|филиал/i.test(lowerMsg)) {
      const branchesTextUz =
        branches.length > 0
          ? branches
              .map((b, i) => `${i + 1}. 📍 **${b.name}:** ${b.address}\n   *(Mo'ljal: ${b.landmark}, Tel: ${b.phone})*`)
              .join("\n\n")
          : `📍 ${storeName} — Toshkent shahri`;
      reply = isUz
        ? `📍 **${storeName} filiallari manzillari:**\n\n${branchesTextUz}\n\n⏰ **Ish vaqti:** ${settings.workingHoursUz}`
        : `📍 **Филиалы ${storeName}:**\n\n${branchesList}\n\n⏰ **График работы:** ${settings.workingHoursRu}`;
    } else if (/vaqt|ish vaqt|ochiq|yopiq|nechagacha|график|время|работ/i.test(lowerMsg)) {
      reply = isUz
        ? `⏰ **${storeName} ish vaqti:**\n\n• **${settings.workingHoursUz}**\n• Dam olish kunlarisiz har kuni xizmatingizdamiz!`
        : `⏰ **График работы ${storeName}:**\n\n• **${settings.workingHoursRu}**\n• Работаем ежедневно без выходных!`;
    } else if (/yetkaz|dostavka|kuryer|viloyat|доставк|курьер|регион/i.test(lowerMsg)) {
      reply = formatDeliveryInfo(settings, isUz);
    } else if (/to'lov|tolov|karta|click|payme|uzum|naqd|оплат|карт/i.test(lowerMsg)) {
      reply = isUz
        ? `💳 **${storeName} do'konida to'lov usullari:**\n\n` +
          `• 🔵 **Click** va 🟢 **Payme** (ilovadan 1 bosishda)\n` +
          `• 🟣 **Uzum Bank** orqali\n` +
          `• 💳 **Uzcard / Humo** kartalari\n` +
          `• 💵 **Naqd pul** (kuryerga yoki filialda)\n\n` +
          `To'lov kartasi (${settings.cardBank}): **${settings.cardNumber}** (${settings.cardHolder}).`
        : `💳 **Способы оплаты в ${storeName}:**\n\n` +
          `• 🔵 **Click**, 🟢 **Payme**, 🟣 **Uzum Bank**, карты **Uzcard / Humo** или **наличными** при получении.\n` +
          `Карта (${settings.cardBank}): **${settings.cardNumber}** (${settings.cardHolder}).`;
    } else if (/aloqa|bog'lan|boglan|telefon|nomer|raqam|admin|menejer|telegram|instagram|телефон|связ|контакт|номер/i.test(lowerMsg)) {
      reply = isUz
        ? `📞 **${storeName} bilan bog'lanish:**\n\n` +
          `• **Telefon:** ${settings.phone1}${settings.phone2 ? ` / ${settings.phone2}` : ""}\n` +
          `• **Telegram:** ${settings.telegramUrl}\n` +
          `• **Instagram:** ${settings.instagramUrl} (${settings.storeHandle})\n` +
          `• **Ish vaqti:** ${settings.workingHoursUz}`
        : `📞 **Контакты ${storeName}:**\n\n` +
          `• **Телефон:** ${settings.phone1}${settings.phone2 ? ` / ${settings.phone2}` : ""}\n` +
          `• **Telegram:** ${settings.telegramUrl}\n` +
          `• **Instagram:** ${settings.instagramUrl} (${settings.storeHandle})\n` +
          `• **График работы:** ${settings.workingHoursRu}`;
    } else if (/nima qila|vazifang|imkoniyat|yordam|kimsan|что ты|чем помож|кто ты/i.test(lowerMsg)) {
      reply = isUz
        ? `Men **${storeName}** do'konining **AI Yordamchisi**man 🤖\n\n` +
          `Sizga ikkita asosiy yo'nalishda yordam beraman:\n` +
          `1. 📏 **O'lchamni aniq aniqlash:** Bo'yingiz va vazningizga ko'ra kiyim, shim, kostyum hamda oyoq sm bo'yicha poyabzal razmeringizni hisoblab beraman.\n` +
          `2. 🏬 **Do'kon haqidagi xabarlarga javob:** Filiallar manzili, ish vaqti, dostavka narxlari, to'lov turlari, almashtirish tartibi va mahsulotlar mavjudligi haqida javob beraman.`
        : `Я **AI Помощник** магазина **${storeName}** 🤖\n\n` +
          `Мои основные задачи:\n` +
          `1. 📏 **Определение точного размера** одежды и обуви по вашим параметрам.\n` +
          `2. 🏬 **Ответы на вопросы о магазине:** адреса филиалов, график, доставка, оплата, обмен и наличие товаров.`;
    } else if (/rahmat|raxmat|tashakkur|zo'r|zor|спасибо|отлично/i.test(lowerMsg)) {
      reply = isUz
        ? `Arzimaydi! Yordam bera olganimdan xursandman 😊 Yana o'lcham yoki do'kon haqida savollaringiz bo'lsa, bemalol yozing.`
        : `Пожалуйста! Рад помочь 😊 Если появятся вопросы по размерам или заказу — пишите в любое время.`;
    } else if (/^(salom|assalom|assalomu|qalaysiz|privet|hi|hello|здравствуй)/i.test(lowerMsg)) {
      reply = isUz
        ? `Assalomu alaykum! **${storeName}** AI Yordamchisiga xush kelibsiz 🤖\n\nO'lchamingizni aniqlash kerakmi yoki do'konimiz haqida (filiallar, yetkazib berish, to'lov, mahsulotlar) savolingiz bormi? Yozib yuboring!`
        : `Здравствуйте! Добро пожаловать в AI Помощник **${storeName}** 🤖\n\nПомочь определить ваш размер или ответить на вопрос о магазине (филиалы, доставка, оплата, товары)? Напишите ваш вопрос!`;
    } else {
      // Dynamic catalog search for any product/price message
      const matchedProducts = findMatchingProducts(inStockProducts, lowerMsg);
      if (matchedProducts.length > 0) {
        const listText = matchedProducts
          .map(
            (p) =>
              `• **${isUz ? p.name : p.nameRu || p.name}** — **${p.price.toLocaleString("uz-UZ")} ${isUz ? "so'm" : "сум"}** (${isUz ? "O'lchamlar" : "Размеры"}: ${p.sizes.join(", ")})`
          )
          .join("\n");
        reply = isUz
          ? `🛍️ So'rovingiz bo'yicha katalogdagi mavjud mahsulotlar:\n\n${listText}\n\nQaysi o'lcham sizga mos kelishini aniqlash uchun bo'yingiz va vazningizni yozing!`
          : `🛍️ Подходящие товары из каталога в наличии:\n\n${listText}\n\nНапишите ваш рост и вес, чтобы я подобрал точный размер!`;
      } else if (/mahsulot|katalog|narx|qancha|necha pul|товар|катал|цена|сколько/i.test(lowerMsg)) {
        const sample = inStockProducts
          .slice(0, 6)
          .map((p) => `• **${isUz ? p.name : p.nameRu || p.name}** — **${p.price.toLocaleString("uz-UZ")} ${isUz ? "so'm" : "сум"}** (${p.sizes.join(", ")})`)
          .join("\n");
        reply = isUz
          ? `🛍️ **${storeName}** katalogida hozir **${inStockProducts.length} ta** mahsulot mavjud:\n\n${sample}\n\nBarchasini **Katalog** bo'limida ko'rishingiz yoki aynan qiziqtirgan kiyim nomini yozishingiz mumkin.`
          : `🛍️ В каталоге **${storeName}** сейчас доступно **${inStockProducts.length}** товаров:\n\n${sample}\n\nНапишите название интересующей модели, и я подскажу цену и размеры!`;
      } else {
        reply = isUz
          ? `Xabaringizni qabul qildim! Men **${storeName}** AI Yordamchisiman 🤖\n\nSizga quyidagilarda darhol yordam bera olaman:\n` +
            `• 📏 **O'lcham aniqlash:** *"Bo'yim 178 sm, vaznim 75 kg"* yoki *"27 sm oyoq"*\n` +
            `• 📍 **Filiallar va ish vaqti:** *"Filiallar qayerda?"*\n` +
            `• 🚚 **Yetkazib berish va to'lov:** *"Dostavka qancha?"*, *"To'lov turlari"*\n` +
            `• 🛍️ **Mahsulotlar va almashtirish:** Istalgan kiyim nomi yoki bog'lanish ma'lumotlari.\n\n` +
            `Agar operator bilan gaplashmoqchi bo'lsangiz: **${settings.phone1}**`
          : `Я **AI Помощник** магазина **${storeName}** 🤖\n\nМогу помочь с:\n` +
            `• 📏 **Подбором размера:** напишите *"Рост 178, вес 75"* или длину стопы\n` +
            `• 📍 **Адресами и графиком работы**\n` +
            `• 🚚 **Доставкой, оплатой и обменом**\n` +
            `• 🛍️ **Наличием и ценами товаров**\n\n` +
            `Связь с менеджером: **${settings.phone1}**`;
      }
    }

    return NextResponse.json({
      success: true,
      reply,
      provider: "assistant-engine",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

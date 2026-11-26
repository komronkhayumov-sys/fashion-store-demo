import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseHealth, getSettings, saveSettings, verifyPin } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const pinHeader = req.headers.get("x-admin-pin") || "";
    const isAdmin = await verifyPin(pinHeader);
    const settings = await getSettings();
    const dbHealth = await checkSupabaseHealth();
    const isDatabaseConnected = dbHealth.connected;

    if (!isAdmin) {
      // Omit sensitive secrets for public
      const { adminPin: _adminPin, telegramBotToken: _bot, telegramChatId: _chat, geminiApiKey: _gemini, ...publicSettings } = settings;
      void _adminPin; void _bot; void _chat; void _gemini;
      return NextResponse.json(
        { success: true, settings: publicSettings, isDatabaseConnected },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, settings, isDatabaseConnected, dbError: dbHealth.error },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const pinHeader = req.headers.get("x-admin-pin") || "";
    const isValid = await verifyPin(pinHeader);

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Noto'g'ri PIN kod (Unauthorized)" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();

    // If updating PIN, validate length
    if (body.adminPin !== undefined && String(body.adminPin).trim().length < 4) {
      return NextResponse.json({ success: false, error: "PIN kod kamida 4 xonali bo'lishi kerak" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updated = await saveSettings(body);
    const dbHealth = await checkSupabaseHealth();
    return NextResponse.json({ success: true, settings: updated, isDatabaseConnected: dbHealth.connected, dbError: dbHealth.error }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

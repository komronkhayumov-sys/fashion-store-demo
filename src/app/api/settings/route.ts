import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, verifyPin } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const pinHeader = req.headers.get("x-admin-pin") || "";
    const isAdmin = await verifyPin(pinHeader);
    const settings = await getSettings();

    if (!isAdmin) {
      // Omit sensitive secrets for public
      const { adminPin: _adminPin, telegramBotToken: _bot, telegramChatId: _chat, geminiApiKey: _gemini, ...publicSettings } = settings;
      void _adminPin; void _bot; void _chat; void _gemini;
      return NextResponse.json({ success: true, settings: publicSettings });
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const pinHeader = req.headers.get("x-admin-pin") || "";
    const isValid = await verifyPin(pinHeader);

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Noto'g'ri PIN kod (Unauthorized)" }, { status: 401 });
    }

    const body = await req.json();

    // If updating PIN, validate length
    if (body.adminPin !== undefined && String(body.adminPin).trim().length < 4) {
      return NextResponse.json({ success: false, error: "PIN kod kamida 4 xonali bo'lishi kerak" }, { status: 400 });
    }

    const updated = await saveSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

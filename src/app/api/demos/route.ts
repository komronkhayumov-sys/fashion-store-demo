import { NextRequest, NextResponse } from "next/server";
import {
  deleteDemoProfile,
  getDemoProfile,
  getDemoProfilesList,
  sanitizeDemoSlug,
  saveDemoProfile,
  verifyPin,
} from "@/lib/storage";

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
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const demo = await getDemoProfile(slug);
      if (!demo) {
        return NextResponse.json(
          { success: false, error: "Demo profili topilmadi" },
          { status: 404, headers: NO_CACHE_HEADERS }
        );
      }

      if (!isAdmin && demo.settings) {
        const {
          adminPin: _adminPin,
          telegramBotToken: _bot,
          telegramChatId: _chat,
          geminiApiKey: _gemini,
          ...publicSettings
        } = demo.settings;
        void _adminPin;
        void _bot;
        void _chat;
        void _gemini;
        return NextResponse.json(
          { success: true, demo: { ...demo, settings: publicSettings } },
          { headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json({ success: true, demo }, { headers: NO_CACHE_HEADERS });
    }

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Noto'g'ri PIN kod (Unauthorized)" },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const demos = await getDemoProfilesList();
    return NextResponse.json({ success: true, demos }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json(
      { success: false, error: "Noto'g'ri PIN kod (Unauthorized)" },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const rawSlug = body.slug || body.storeName || body.clientName || "";
    const slug = sanitizeDemoSlug(rawSlug);
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Demo link (slug) kiritilishi shart" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existing = await getDemoProfile(slug);
    if (existing && !body.overwrite) {
      return NextResponse.json(
        { success: false, error: `"${slug}" nomli demo allaqachon mavjud` },
        { status: 409, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveDemoProfile({
      slug,
      clientName: body.clientName || body.settings?.storeName || slug,
      settings: body.settings || {},
      products: Array.isArray(body.products) ? body.products : undefined,
      useCustomProducts: body.useCustomProducts ?? true,
    });

    return NextResponse.json({ success: true, demo: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PUT(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json(
      { success: false, error: "Noto'g'ri PIN kod (Unauthorized)" },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const slug = sanitizeDemoSlug(body.slug || "");
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Demo slug ko'rsatilmagan" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveDemoProfile({
      slug,
      clientName: body.clientName,
      settings: body.settings,
      products: body.products,
      useCustomProducts: body.useCustomProducts,
    });

    return NextResponse.json({ success: true, demo: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json(
      { success: false, error: "Noto'g'ri PIN kod (Unauthorized)" },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Demo slug ko'rsatilmagan" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const deleted = await deleteDemoProfile(slug);
    return NextResponse.json({ success: deleted }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

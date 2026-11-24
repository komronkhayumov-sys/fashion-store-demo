import { NextRequest, NextResponse } from "next/server";
import { getCustomers, saveCustomer, updateCustomer, verifyPin } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const customers = await getCustomers();
    return NextResponse.json({ success: true, customers }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: "Mijoz ID si ko'rsatilmagan" }, { status: 400 });
    }
    const updated = await updateCustomer(body.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Mijoz topilmadi" }, { status: 404 });
    }
    return NextResponse.json({ success: true, customer: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, error: "Ism va telefon raqami kiritilishi shart" },
        { status: 400 }
      );
    }

    const customer = await saveCustomer({
      name: body.name.trim(),
      phone: body.phone.trim(),
      address: body.address?.trim(),
      preferredSize: body.preferredSize,
      measurements: body.measurements,
    });

    return NextResponse.json({ success: true, customer });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

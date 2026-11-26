import { NextRequest, NextResponse } from "next/server";
import {
  deleteProduct,
  getDemoProfile,
  getEffectiveProducts,
  saveDemoProfile,
  saveProduct,
  verifyPin,
} from "@/lib/storage";
import { Product } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.toLowerCase();
    const demoSlug = searchParams.get("demo");

    let products = await getEffectiveProducts(demoSlug);

    if (category && category !== "all") {
      products = products.filter((p) => p.category === category);
    }

    if (query) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          (p.nameRu && p.nameRu.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({ success: true, products }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

async function saveDemoProduct(demoSlug: string, body: Partial<Product>): Promise<Product> {
  const demo = await getDemoProfile(demoSlug);
  const currentProducts = Array.isArray(demo?.products) ? [...demo.products] : [];
  const productId = body.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const existingIdx = currentProducts.findIndex((p) => p.id === productId);

  const saved: Product =
    existingIdx !== -1
      ? { ...currentProducts[existingIdx], ...body, id: productId }
      : {
          id: productId,
          name: body.name || "Yangi mahsulot",
          nameRu: body.nameRu || body.name || "Новый товар",
          description: body.description || "",
          descriptionRu: body.descriptionRu || body.description || "",
          price: Number(body.price) || 0,
          oldPrice: body.oldPrice ? Number(body.oldPrice) : undefined,
          category: body.category || "katalog",
          image: body.image || "/moda-logo.svg",
          images: Array.isArray(body.images) ? body.images : body.image ? [body.image] : [],
          sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ["M", "L", "XL"],
          colors: Array.isArray(body.colors) ? body.colors : [],
          isAvailable: body.isAvailable ?? true,
          isFeatured: body.isFeatured ?? false,
          badge: body.badge,
          createdAt: new Date().toISOString(),
        };

  if (existingIdx !== -1) {
    currentProducts[existingIdx] = saved;
  } else {
    currentProducts.unshift(saved);
  }

  await saveDemoProfile({
    slug: demoSlug,
    clientName: demo?.clientName || demoSlug,
    products: currentProducts,
    useCustomProducts: demo?.useCustomProducts ?? true,
  });

  return saved;
}

export async function POST(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json({ success: false, error: "Noto'g'ri PIN kod (Unauthorized)" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const demoSlug = new URL(req.url).searchParams.get("demo");
    const body = await req.json();
    if (!body.name || !body.price) {
      return NextResponse.json({ success: false, error: "Mahsulot nomi va narxi kiritilishi shart" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const saved = demoSlug ? await saveDemoProduct(demoSlug, body) : await saveProduct(body);
    return NextResponse.json({ success: true, product: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json({ success: false, error: "Noto'g'ri PIN kod (Unauthorized)" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const demoSlug = new URL(req.url).searchParams.get("demo");
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: "Mahsulot IDsi ko'rsatilmagan" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updated = demoSlug ? await saveDemoProduct(demoSlug, body) : await saveProduct(body);
    return NextResponse.json({ success: true, product: updated }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  if (!(await verifyPin(pinHeader))) {
    return NextResponse.json({ success: false, error: "Noto'g'ri PIN kod (Unauthorized)" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const demoSlug = searchParams.get("demo");
    if (!id) {
      return NextResponse.json({ success: false, error: "Mahsulot IDsi ko'rsatilmagan" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (demoSlug) {
      const demo = await getDemoProfile(demoSlug);
      const nextProducts = (demo?.products || []).filter((p) => p.id !== id);
      await saveDemoProfile({
        slug: demoSlug,
        clientName: demo?.clientName || demoSlug,
        products: nextProducts,
      });
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    const deleted = await deleteProduct(id);
    return NextResponse.json({ success: deleted }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

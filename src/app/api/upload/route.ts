import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyPin } from "@/lib/storage";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export async function POST(req: NextRequest) {
  const pinHeader = req.headers.get("x-admin-pin") || "";
  const uploadTypeHeader = req.headers.get("x-upload-type") || "";
  const isAdmin = await verifyPin(pinHeader);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const formUploadType = formData.get("type") as string | null;

    const isReceipt = uploadTypeHeader === "receipt" || formUploadType === "receipt";

    if (!isAdmin && !isReceipt) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: "Fayl topilmadi" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        success: false,
        error: "Faqat rasm fayllari (JPG, PNG, WEBP, GIF) qabul qilinadi",
      }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Fayl hajmi 10MB dan oshmasligi kerak" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";

    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.NOW_REGION
    );

    // On serverless (Vercel), process.cwd()/public is read-only.
    // Base64 data URL provides 100% universal zero-disk storage for receipts and uploaded images
    if (isServerless) {
      const base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ success: true, url: base64Url });
    }

    // Local environment: attempt saving to public/uploads with data URL fallback
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const prefix = isReceipt ? "receipt" : "btn";
      const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({ success: true, url: publicUrl });
    } catch (diskErr) {
      console.warn("[upload] Disk write failed, falling back to base64 Data URL:", diskErr);
      const base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ success: true, url: base64Url });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

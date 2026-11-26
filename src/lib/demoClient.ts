/**
 * Client-side helpers for Multi-Client Demo resolution & image compression.
 */

export function resolveActiveDemoSlug(explicitSlug?: string | null): string | null {
  if (explicitSlug && explicitSlug.trim()) {
    const clean = explicitSlug.trim().toLowerCase();
    try {
      sessionStorage.setItem("moda_active_demo", clean);
    } catch {}
    return clean;
  }

  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const queryDemo = params.get("demo");
  if (queryDemo && queryDemo.trim()) {
    const clean = queryDemo.trim().toLowerCase();
    try {
      sessionStorage.setItem("moda_active_demo", clean);
    } catch {}
    return clean;
  }

  // Check /d/<slug> path
  const match = window.location.pathname.match(/^\/d\/([^/]+)/);
  if (match && match[1]) {
    const clean = decodeURIComponent(match[1]).trim().toLowerCase();
    try {
      sessionStorage.setItem("moda_active_demo", clean);
    } catch {}
    return clean;
  }

  // If user is explicitly at root "/" with no ?demo= param, clear active demo so default store loads
  if (window.location.pathname === "/") {
    try {
      sessionStorage.removeItem("moda_active_demo");
    } catch {}
    return null;
  }

  // On /cart, /orders, /product/[id], preserve the active demo from sessionStorage
  try {
    return sessionStorage.getItem("moda_active_demo");
  } catch {
    return null;
  }
}

export function getDemoCacheKeys(demoSlug?: string | null) {
  const suffix = demoSlug ? `_${demoSlug}` : "";
  return {
    settingsKey: `moda_store_settings_cache${suffix}`,
    productsKey: `moda_store_products_cache${suffix}`,
  };
}

/**
 * Compresses an image File on the client side using Canvas so base64 Data URLs
 * stay lightweight (~60-150KB) for fast Supabase/Vercel storage.
 */
export async function compressImageFile(file: File, maxSizePx = 1000, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 120 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxSizePx || height > maxSizePx) {
        if (width > height) {
          height = Math.round((height * maxSizePx) / width);
          width = maxSizePx;
        } else {
          width = Math.round((width * maxSizePx) / height);
          height = maxSizePx;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const ext = outType === "image/png" ? ".png" : ".jpg";
          const newName = file.name.replace(/\.[^.]+$/, "") + ext;
          resolve(new File([blob], newName, { type: outType }));
        },
        outType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

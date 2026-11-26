import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEffectiveProducts, getEffectiveSettings } from "@/lib/storage";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { demo } = await searchParams;
  const [products, settings] = await Promise.all([
    getEffectiveProducts(demo),
    getEffectiveSettings(demo),
  ]);
  const product = products.find((p) => p.id === id);
  const storeName = settings.storeName || "MODA UZ";

  if (!product) {
    return {
      title: `Mahsulot topilmadi — ${storeName}`,
    };
  }

  const title = `${product.name} — ${storeName}`;
  const desc = product.description || `${storeName} kolleksiyasiga mansub zamonaviy kiyim va poyabzallar.`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [
        {
          url: product.image,
          width: 800,
          height: 1000,
          alt: product.name,
        },
      ],
      type: "website",
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { demo } = await searchParams;
  const [allProducts, settings] = await Promise.all([
    getEffectiveProducts(demo),
    getEffectiveSettings(demo),
  ]);
  const product = allProducts.find((p) => p.id === id);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailClient
      product={product}
      allProducts={allProducts}
      settings={settings}
    />
  );
}

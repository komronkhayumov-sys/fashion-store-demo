import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById, getProducts, getSettings } from "@/lib/storage";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: "Mahsulot topilmadi — MODA UZ",
    };
  }

  const title = `${product.name} — MODA UZ`;
  const desc = product.description || "MODA UZ kolleksiyasiga mansub zamonaviy kiyim va poyabzallar.";

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

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await getProducts();
  const settings = await getSettings();

  return (
    <ProductDetailClient
      product={product}
      allProducts={allProducts}
      settings={settings}
    />
  );
}

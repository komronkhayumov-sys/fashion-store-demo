import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MODA UZ — Boshqaruv Paneli (Admin)",
  description: "MODA UZ platformasi buyurtmalar va mahsulotlar boshqaruv paneli",
  manifest: "/manifest-admin.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MODA Admin",
  },
  icons: {
    icon: "/moda-logo-192.png",
    apple: "/moda-logo.svg",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

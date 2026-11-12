import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "MODA UZ — Premium Fashion Store Demo",
  description:
    "MODA UZ — Zamonaviy kiyim-kechak va poyabzallar onlayn do'koni. O'zbekiston kiyim do'konlari uchun tayyor universal onlayn savdo platformasi namunasi (Demo).",
  keywords: [
    "moda uz",
    "onlayn do'kon",
    "kiyim do'koni",
    "zamonaviy kiyimlar",
    "erkaklar kiyimlari",
    "ayollar kiyimlari",
    "poyabzal",
    "tashkent fashion",
    "e-commerce uzbekistan",
    "moda demo",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MODA UZ",
  },
  icons: {
    icon: "/moda-logo-192.png",
    apple: "/moda-logo.svg",
  },
  openGraph: {
    title: "MODA UZ — Online Store Demo",
    description: "Zamonaviy kiyim-kechak va poyabzallar onlayn do'koni. Tayyor onlayn savdo platformasi (Demo).",
    type: "website",
    locale: "uz_UZ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090D14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/moda-logo.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased select-none sm:select-auto selection:bg-violet-700 selection:text-white">
        <Script id="moda-theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var theme = localStorage.getItem('moda_theme') || localStorage.getItem('button_theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            })();
          `}
        </Script>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

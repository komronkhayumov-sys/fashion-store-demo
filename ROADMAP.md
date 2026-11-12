# ROADMAP: MODA UZ — Premium Fashion Store Demo Platform

## 1. Technical Stack & Architecture
- **Framework:** Next.js 16 (App Router with Turbopack & React 19)
- **Language:** TypeScript 5
- **Styling:** TailwindCSS 4 (Modern, Mobile-First, Dark & Light Mode)
- **Icons:** Lucide React
- **Data & CMS Storage:** Local atomic JSON persistence (`data/products.json` & `data/orders.json`), pre-seeded with authentic fashion inventory.
- **Image Management:** Direct Image URLs or local upload handler (`/api/upload` -> `public/uploads`).
- **Real-Time Notification Pipeline:** Telegram Bot API (`https://api.telegram.org/bot<TOKEN>/sendMessage`) with Markdown v2/HTML formatting and graceful local fallback logging.
- **AI Sales & Size Stylist:** Google Gemini API with built-in heuristic fallback engine strictly grounded in store policies and sizing charts.
- **Internationalization:** Seamless bi-lingual toggle (Uzbek `UZ` - default, and Russian `RU`).

## 2. Store Profile & Demo Data
- **Brand:** MODA UZ — Premium Fashion Store (`@modauz_demo`)
- **Instagram:** https://www.instagram.com/modauz_demo/
- **Telegram:** https://t.me/modauz_demo
- **Working Hours:** Every day, 10:00 – 22:00 (Tashkent time UTC+5)
- **Contact Numbers:** `+998 90 123 45 67` & `+998 91 123 45 67`
- **Tashkent Branches:**
  1. **Markaziy:** Toshkent sh., Markaziy filial (Demo), Amir Temur shoh ko'chasi 107
  2. **Yunusobod:** Yunusobod filiali (Demo), Mega Planet yaqini
  3. **Chilonzor:** Chilonzor filiali (Demo), 16-mavze, Katta Qa'ni ko'chasi

## 3. Milestones & Implementation Progress

### Phase 1: Core Foundation & Storefront Architecture (Done)
- [x] Configure TypeScript models (`Product`, `Branch`, `Order`, `OrderItem`, `StoreSettings`).
- [x] Store profile constants with verified demo branches, phones, Wi-Fi credentials, and seed catalog.
- [x] Storage manager (`src/lib/storage.ts`) with auto-seeding.

### Phase 2: Mobile-First Bio-Page Storefront (Done)
- [x] Brand identity header with live dynamic working status (Tashkent 10:00 - 22:00 real-time check).
- [x] Quick Action Buttons (Call, Instagram, Telegram, Showroom Wi-Fi / QR).
- [x] Tashkent Branch Hub with Yandex Maps & Google Maps navigation links.
- [x] Responsive product catalog with category filter pills, search bar, and size badges.
- [x] Uzbek & Russian language switcher + Dark/Light mode support.

### Phase 3: 1-Click Fast Checkout & Telegram Integration (Done)
- [x] 1-Click order modal: Size selection, quantity counter, delivery vs. branch pickup selector.
- [x] Customer phone number formatting (`+998 XX XXX XX XX`).
- [x] Telegram Bot API notification engine formatting order details, total price, customer phone link.
- [x] Fallback order persistence so orders are never lost even if bot token is not configured.

### Phase 4: Self-Service Owner Admin Panel (`/admin`) (Done)
- [x] PIN-based authentication (`ADMIN_PIN`, default `1234`) with 1-click test button.
- [x] Catalog manager: Add, edit, toggle visibility, and delete products.
- [x] Image URL paste + local file upload helper.
- [x] Orders viewer: View incoming customer leads and update order statuses.
- [x] Quick metrics: Total products, active orders, revenue preview.
- [x] Dynamic Store Settings tab: edit Store Name, Phone Numbers, Telegram/Instagram links, Working Hours, Delivery Tariffs, and Payment Card Details.

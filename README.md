# MODA UZ — Premium Fashion Store Demo Platform

Universal, white-label fashion e-commerce demo platform (**MODA UZ — Premium Fashion Store**) designed for showcasing and selling to clothing store owners across Uzbekistan.

---

## 🌟 Key Features

1. **Store Bio & Branch Hub:**
   - Real-time opening status indicator (Tashkent 10:00 – 22:00 live client calculation in `Asia/Tashkent` timezone).
   - Direct 1-tap call buttons for store phones (`+998 90 123 45 67` & `+998 91 123 45 67`).
   - Interactive showroom Wi-Fi helper (SSID: `MODA_GUEST`, Password: `modauz2026`).
   - Tashkent Branch Hub with direct **Yandex Xarita** and **Google Maps** navigation links:
     - **Toshkent sh., Markaziy filial (Demo):** Amir Temur shoh ko'chasi, 107-uy
     - **Yunusobod filiali (Demo):** Ahmad Donish ko'chasi, Mega Planet yaqini
     - **Chilonzor filiali (Demo):** 16-mavze, Katta Qa'ni ko'chasi
   - Instant language switch (**UZ** - Uzbek default & **RU** - Russian).
   - High-contrast Dark & Light mode.

2. **Self-Service Owner Admin Panel (`/admin`):**
   - Protected by simple Owner PIN (`ADMIN_PIN`, default `1234`) with 1-tap demo login badge.
   - Dynamic Store Settings tab: edit Store Name, Phone Numbers, Telegram/Instagram links, Working Hours, Delivery Tariffs, and Payment Card Details with instant storefront reflection.
   - Catalog manager: add, edit, toggle in-stock availability, or delete items.
   - Set prices in UZS, discount old price, and select clothing/shoe sizes.
   - Upload product photos directly or paste image URLs.
   - Live incoming customer orders tracker with status management (`new`, `confirmed`, `delivered`, `cancelled`).

3. **1-Click Customer Order & Branch Reservation Flow:**
   - Customer picks a product, selects size and quantity.
   - Chooses **Tashkent Delivery** (1-3 hours) or **Branch Pickup/Reservation**.
   - Submits in 10 seconds with `+998` phone number.
   - Automatically sends formatted order alerts to the store owner's Telegram via Bot API, with zero-crash simulated fallback mode if tokens are not yet configured.

4. **24/7 AI Sales & Size Assistant:**
   - Interactive **Height (cm) & Weight (kg) Size Calculator** recommending exact fits (`S, M, L, XL, XXL, 3XL` and suit sizes `46–56`).
   - AI Chat answering branch locations, hours, delivery terms, and store policies.
   - Powered by **Google Gemini API** (`GEMINI_API_KEY`) with intelligent local heuristic NLP fallback.

---

## 🚀 Getting Started

### 1. Installation & Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your mobile browser or emulator.

### 2. Admin Panel

Access the dashboard at [http://localhost:3000/admin](http://localhost:3000/admin).
- **Demo PIN:** `1234`

### 3. Production Build

```bash
npm run build
npm run start
```

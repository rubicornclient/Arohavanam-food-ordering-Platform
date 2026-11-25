# AAROHA VANAM - Restaurant Ordering Demo

A frontend-only restaurant ordering demo built with React, TypeScript, Vite and Tailwind CSS. The customer site uses the restaurant name, tagline and Madanapalle location supplied by the owner. Menu prices and transactions remain demonstration data.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL. The customer ordering page is at `/`; the owner preview is at `/admin`.

## Customer routes

- `/` - Browse dishes and combos, search the menu, add items to an order and submit feedback.
- `/checkout` - Enter a full name, a 10-digit Indian mobile number and a dine-in table.
- `/payment` - Try simulated payment success, failure, cancellation and retry.
- `/order-success` - View the confirmed demo order and its saved line-item snapshot.
- `/track-order` - Look up the order status saved in this browser.

## Owner routes

- `/admin` - Open owner preview; no production authentication is configured.
- `/admin/overview` - Demo statistics and recent orders.
- `/admin/menu` - Edit dishes, sample prices, availability and photographs.
- `/admin/categories` - Rename, reorder and show or hide categories.
- `/admin/combos` - Edit combo contents, sample prices and availability.
- `/admin/orders` - Review local orders and update their kitchen status.
- `/admin/payments` - Review simulated transactions.
- `/admin/feedback` - Review customer ratings, selected comments and written feedback.
- `/admin/settings` - Update restaurant details, tables, taxes and charges.

## Data and images

The browser storage service uses versioned LocalStorage keys including `rrr_settings`, `rrr_menu_items`, `rrr_orders`, `rrr_payment_records` and `rrr_feedback`. Feedback and orders are local to the browser profile and are not sent to the restaurant or shared across devices.

The AAROHA VANAM mark is a local SVG recreation based on the logo reference supplied by the owner. Food photographs and their per-file sources and licenses are listed in [`public/assets/image-manifest.json`](public/assets/image-manifest.json). The customer site links to that manifest in its footer.

The owner supplied Madanapalle as the location. Phone number and opening hours are left blank until the restaurant provides them. Food prices and table numbers are demo values.

## Build and Vercel

```sh
npm run build
npm run preview
```

`vercel.json` rewrites direct SPA routes to the Vite entry point. No backend secrets or environment variables are required. Deployment has not been performed or verified; the Vercel CLI is not authenticated in this environment.

## Demo limits

There is no production backend, customer or owner authentication, live payment gateway, QR ordering, or restaurant notification. Payment attempts are simulated. The `/admin` preview is open and must not be used for real restaurant operations.
# Arohavanam-food-ordering-Platform

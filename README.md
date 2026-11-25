# AAROHA VANAM Restaurant Ordering

A React, TypeScript and Vite ordering website with a customer menu, checkout, feedback form and owner dashboard.

## Run locally

```sh
npm install
npm run dev
```

The admin login runs through the local Vite API middleware. `.env.local` is ignored by Git; copy `.env.example` and set the admin email, password and a random session secret when configuring another environment.

## Pages

- `/` - Browse the menu, add dishes to an order and review combos.
- `/checkout` - Enter customer details, choose a table and leave feedback.
- `/payment` - Complete a payment outcome in the local payment simulator.
- `/track-order` - View the status of an order saved in this browser.
- `/admin` - Sign in before opening the owner dashboard.
- `/admin/menu`, `/admin/orders`, `/admin/payments`, `/admin/feedback`, `/admin/settings` - Manage the menu and review browser-stored activity.

The feedback form is on the place-order page. Its preset sentences are listed under “Suggestions” and can be edited or combined with a written comment.

## Admin sign-in

The `/api/admin/auth` server endpoint validates credentials against environment variables and issues an HTTP-only signed session cookie. The password and session secret are never included in client-side code or committed files.

Set these environment variables for local or hosted deployments:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (at least 32 characters; use a random value)

For Vercel, add them in **Project Settings → Environment Variables** for Production and Preview, then redeploy. Vercel requires a new deployment for updated environment variables to take effect.

## Data and deployment

Menu settings, orders, payments and feedback are stored in the current browser, so they are not shared between devices. The payment flow is a simulator and does not collect money.

The dashboard payment summary supports Today, Yesterday and a date picker. It filters payments and orders stored in the current browser by India Standard Time.

Vercel serves `/api/admin/auth` as a function and rewrites customer-side routes to the Vite app. `npm run build` runs TypeScript checks and creates the production site in `dist/`.

Food photo credits and licenses are listed in [`public/assets/image-manifest.json`](public/assets/image-manifest.json). The restaurant logo is a local SVG recreation of the reference image supplied by the owner.

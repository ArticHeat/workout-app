# Workout App

Vite + React + TypeScript front end with Supabase Auth and **mandatory
two-factor authentication** (authenticator-app TOTP), deployed to Cloudflare.
See [`docs/PLAN.md`](docs/PLAN.md) for the AI coach / agent harness roadmap.

## Auth flow

1. Sign up or sign in with email + password.
2. First sign-in: scan a QR code with an authenticator app and confirm a 6-digit code.
3. Every later sign-in: enter a code from the app.

The app is only reachable once the session is at assurance level `aal2`
(password + code). Each route is guarded in `src/auth/RequireStatus.tsx`.

> This guards the **UI**. When the API and database arrive, enforce `aal2`
> server-side too (Supabase RLS: `(auth.jwt()->>'aal') = 'aal2'`, or check the
> JWT's `aal` claim in the Worker).

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Authentication → Sign In / Providers** keep Email enabled. In
   **Authentication → Multi-Factor**, make sure TOTP is enabled (on by default).
3. In **Authentication → URL Configuration**, set the Site URL to your Cloudflare
   domain and add `http://localhost:5173` to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL and
   publishable key (Project Settings → API).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Deploy to Cloudflare

`wrangler.jsonc` serves `dist/` as static assets, with SPA fallback so routes
like `/login` work on refresh.

- **From your machine:** `npx wrangler login`, then `npm run deploy`.
- **From GitHub (Workers Builds):** in the Cloudflare dashboard, connect this
  repo, set the build command to `npm run build` and the deploy command to
  `npx wrangler deploy`, and add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` as **build** variables (Vite inlines them at
  build time).

Then attach your custom domain under the Worker's **Settings → Domains & Routes**.

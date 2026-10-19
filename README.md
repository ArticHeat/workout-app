# Hybrid Athlete Training app (Vite + React)

Free installable PWA. Your own Google Sheet is the database (via a small Apps Script); an optional free Gemini key powers the Coach.

## Develop
```
npm install
npm run dev       # local dev server
npm test          # 36 tests (vitest)
npm run build     # outputs dist/
```

## Step 1. Google Sheet (5 min)
1. Open your Training Log sheet (or sheets.new) > Extensions > Apps Script.
2. Paste `apps-script/Code.gs`, set `PASSWORD` to a long random value, save.
3. Run `setup` once and approve permissions.
4. Deploy > New deployment > Web app. Execute as: Me. Access: Anyone. Copy the `/exec` URL.

## Step 2. Host on Cloudflare Pages (free)
**Option A, drag and drop:** Workers & Pages > Create > Pages > Upload assets, then drop the contents of the prebuilt `dist/` folder.

**Option B, from Git:** push this project to GitHub, then Pages > Connect to Git with:
- Build command: `npm run build`
- Build output directory: `dist`
- No environment variables.

## Step 3. Install on your phone
Open the site. iPhone: Share > Add to Home Screen. Android: menu > Install app.
In Training Overview > App connection, paste the Web app URL and password, then Save and test.

## Notes
- Same `plb-*` storage keys and Sheet layout as the old single-file app, so existing devices and backups keep working.
- After deploying an update, bump `CACHE` in `public/sw.js` (e.g. `plb-app-v3`) if phones keep showing the old version.
- Never commit your URL or password; they live only in each device's browser.
- Spring force assumptions (chest expander 10 kg, crusher 30 kg) are in `src/data/schedule.js` (`SPRING_KG`); edit if yours differ.

## Cloudflare (Git-connected)
`wrangler.jsonc` serves `dist/` as a single-page app. Build command `npm run build`, no environment variables. Every push to the connected branch redeploys.

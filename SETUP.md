# Frontend — Local Setup (Windows / Linux / macOS)

Next.js 16 (App Router, TypeScript, Tailwind) web app. Talks to the Spring Boot API.

> First time on this machine? Install prerequisites via the master guide:
> [`../SETUP.md` §1](../SETUP.md). You need **Node.js 20 (LTS)** for the frontend.
> The **backend + Docker services must be running** for the app to do anything useful —
> set those up first via [`../realestate-backend/SETUP.md`](../realestate-backend/SETUP.md).

---

## Step 1 — Verify Node

```bash
node -v     # must be v20.x
npm -v
```

> On this dev machine Node is installed via nvm. If `node` isn't found:
> `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`

---

## Step 2 — Install dependencies

```bash
npm install
```

(Run from inside `realestate-frontend/`. This creates `node_modules/`.)

---

## Step 3 — Create your env file

```bash
# Linux / macOS
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

Then check `.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8080/api      # points at your local Spring Boot
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

The API URL default is correct for local dev. The Google Maps key is optional — map features
degrade gracefully without it. `.env.local` is gitignored — never commit it.

---

## Step 4 — Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000**. The app hot-reloads on save.

> If port 3000 is taken, Next.js will offer the next free port, or run `npm run dev -- -p 3001`.

---

## Step 5 — Validate after any change

```bash
npx tsc --noEmit     # type check — must pass
npm run lint         # eslint — must pass
```

Both must be clean before a change is done.

---

## Production build (optional, to catch build-only errors)

```bash
npm run build        # the same build Vercel runs
npm run start        # serve the production build locally
```

> Build-time gotcha: any component using `useSearchParams()` must be a Client Component and
> either a leaf or wrapped in `<Suspense>` — using it in shared shell/layout components breaks
> the Vercel build. See `CLAUDE.md`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Pages load but no data / network errors | Backend not running, or `NEXT_PUBLIC_API_URL` wrong. Confirm `curl http://localhost:8080/api/actuator/health`. |
| `node`/`npm` not found (Linux nvm) | `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`. |
| `next: command not found` | You skipped `npm install`. |
| CORS errors in browser console | Backend `CORS_ORIGINS` must include `http://localhost:3000` (it does by default). |
| Port 3000 in use | `npm run dev -- -p 3001` (then the API's allowed origins already include 3001). |
| Stale build issues | Delete `.next/` and re-run `npm run dev`. |

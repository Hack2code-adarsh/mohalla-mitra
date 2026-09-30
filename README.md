# Service Sphere — Upgraded Full-Stack Project

A practical local services marketplace for Indian cities. Customers discover nearby vendors, book services, and track orders. Vendors manage incoming orders from their dashboard.

## What is included

- Customer and vendor account flows
- Demo OTP login/signup using email or mobile number
- Google/Gmail login placeholder with clear setup instructions
- City-based location filtering: Kanpur, Delhi, Lucknow, Gurugram, Noida
- Customer dashboard: bookings, statuses, cancellation
- Vendor dashboard: incoming orders, accept/reject, in-progress, completed
- Vendor signup/listing flow
- Booking flow connected to logged-in customers
- FastAPI + SQLite backend
- React + Vite frontend

## Important note about authentication

This project includes a **demo OTP system**. During development, the OTP is returned on screen/API response so you can test easily.

For real production OTP, connect a provider such as:
- Firebase Auth
- Twilio
- MSG91
- Fast2SMS

Google login is included as a frontend-ready placeholder. To make it real, create a Google OAuth Client ID and connect Google Identity Services. Until then, use demo OTP login.

## Folder structure

```text
Service Sphere-upgraded/
  backend/
    main.py
    requirements.txt
  frontend/
    package.json
    index.html
    src/
      api.js
      main.jsx
      App.jsx
      styles.css
      components/
        Navbar.jsx
        CitySelector.jsx
        ProtectedRoute.jsx
      pages/
        Home.jsx
        Login.jsx
        VendorSignup.jsx
        CustomerDashboard.jsx
        VendorDashboard.jsx
        Category.jsx
```

## Run backend on Windows PowerShell

```powershell
cd C:\Users\Adarsh\Downloads\Service Sphere-upgraded\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend API opens at:

```text
http://127.0.0.1:8000
```

## Run frontend in second PowerShell terminal

```powershell
cd C:\Users\Adarsh\Downloads\Service Sphere-upgraded\frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Demo login flow

1. Click **Login**.
2. Choose role: Customer or Vendor.
3. Enter name, email/mobile, and city.
4. Click **Send OTP**.
5. The demo OTP appears on screen.
6. Enter OTP and verify.

## Demo users you can create

- Customer in Kanpur: sees Kanpur vendors
- Customer in Delhi: sees Delhi vendors
- Vendor in Kanpur: create a vendor listing and manage orders

## How orders work

1. Customer logs in.
2. Customer selects city and category.
3. Customer books a vendor.
4. Booking appears in customer dashboard.
5. If vendor account is linked to that vendor, booking appears in vendor dashboard.
6. Vendor can update status: accepted, rejected, in progress, completed.

## Production upgrade ideas

- Replace demo OTP with Firebase Auth or MSG91.
- Add Google OAuth verification on backend.
- Add exact GPS distance using latitude/longitude.
- Add vendor document verification.
- Add payment integration.
- Deploy backend on Render/Railway and frontend on Vercel.

## Google login setup

This project now includes Google login. The frontend uses this Client ID:

```text
1009125264293-gh5gcga6tosa7tse5e10r27upq7eip40.apps.googleusercontent.com
```

In Google Cloud Console, your OAuth Web Application must include this Authorized JavaScript origin:

```text
http://localhost:5173
```

Backend verification uses `GOOGLE_CLIENT_ID`. For local development it already defaults to the same client ID. For production, set an environment variable instead.

Important: users login through Google's secure popup. Do not ask for or store Google passwords.

## Email username/password login

The app now supports registering with:

- Full name
- Email address
- Username
- Password
- Role: customer or vendor
- City

After registration, users can log in next time using either their username or email plus password. Passwords are not stored directly; the backend stores a salted hash for demo-level security.

## Deployment

This repo is set up to deploy the **backend on Render** and the **frontend on Vercel**. Config files already exist: `render.yaml` (repo root) and `frontend/vercel.json`.

### Step 0 — Commit and push

Push all current changes to GitHub first (Render and Vercel both deploy from the `main` branch):

```powershell
git add -A
git commit -m "Add deployment configs and production-ready CORS/upload handling"
git push origin main
```

### Step 1 — Deploy backend on Render

1. Go to <https://dashboard.render.com> → **New** → **Blueprint**.
2. Select the `Hack2code-adarsh/mohalla-mitra` repository. Render reads `render.yaml` automatically.
3. Add these environment variables in the Render dashboard (the `sync: false` ones):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon connection string (same as in `backend/.env`) |
   | `CORS_ORIGINS` | Your Vercel frontend URL, e.g. `https://mohalla-mitra.vercel.app` (add `http://localhost:5173` too, comma-separated, for local testing) |
   | `GOOGLE_CLIENT_ID` | `1009125264293-gh5gcga6tosa7tse5e10r27upq7eip40.apps.googleusercontent.com` |

4. Deploy. The health check endpoint is `/api/health`. Once live, note the backend URL, e.g. `https://mohalla-mitra-backend.onrender.com`.

### Step 2 — Deploy frontend on Vercel

1. Go to <https://vercel.com/new`>.
2. Import the `Hack2code-adarsh/mohalla-mitra` repository.
3. **Root Directory** → set to `frontend` (important — the Vite app lives there).
4. Framework preset should auto-detect **Vite** (see `frontend/vercel.json`).
5. Add this environment variable:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE` | Your Render backend URL, e.g. `https://mohalla-mitra-backend.onrender.com` (no trailing slash) |

6. Deploy. Note the frontend URL, e.g. `https://mohalla-mitra.vercel.app`.

### Step 3 — Wire them together

1. Copy your Vercel frontend URL back into Render's `CORS_ORIGINS` env var (so the backend accepts requests from the frontend).
2. Redeploy both if you changed env vars after the first deploy.

### Step 4 — Google OAuth (production origins)

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID → **Authorized JavaScript origins**, add both:

```text
https://mohalla-mitra.vercel.app
http://localhost:5173
```

Without this, Google login will fail on the deployed site.

### Notes and limitations

- **Uploads are ephemeral on Render**: the free tier uses a disposable filesystem. Uploaded vendor photos work during a single deploy but are wiped on the next redeploy. For persistent uploads, connect cloud storage (e.g. Cloudinary, S3, or Supabase Storage) and change the `/api/upload` endpoint.
- **Render free tier sleeps**: the backend sleeps after 15 min of inactivity, so the first request after sleep takes ~30–60s to wake up.
- **`DATABASE_URL` is never committed** — it lives only in `backend/.env` (local) and Render env vars (production). The `.gitignore` excludes it.

# Event Management Portal

Doctor registration + paid/free events + Razorpay payment + QR ticket email + venue check-in scanner + printable PDF badge.

**Stack:** React (Vite + Tailwind) · Node + Express · MongoDB (Mongoose) · JWT/OTP auth · Razorpay · Nodemailer (SES/SendGrid) · PDFKit + QRCode.

```
.
├── server/   Express API
└── client/   React SPA
```

## Quick start

### 1. Backend
```bash
cd server
cp .env.example .env      # fill MONGO_URI, JWT_SECRET, Razorpay, SMTP, ADMIN_MOBILE
npm install
npm run seed              # sample events + admin
npm run dev               # http://localhost:5000
```

### 2. Frontend
```bash
cd client
cp .env.example .env      # VITE_RAZORPAY_KEY_ID
npm install
npm run dev               # http://localhost:5173
```

MongoDB must be running locally (or set Atlas URI). OTP prints to the server console in dev (`OTP_DEV_MODE=true`).

## Flows

**Register:** login (mobile OTP) → complete profile (+ photo, required) → pick event → free = instant / paid = Razorpay checkout → QR ticket emailed.

**Check-in:** admin opens `/scan` → camera or USB scanner reads QR → server marks `checked_in`, returns doctor data → **Print Badge** streams the PDF badge (gradient ID card: logo, photo circle, name, specialty • hospital, QR).

**Admin:** `/admin` → create events, live stats (registered/checked-in/paid), attendee table, CSV export.

## Key API routes
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/request-otp` | send OTP |
| POST | `/api/auth/verify-otp` | login / detect new user |
| POST | `/api/auth/complete-profile` | create doctor (multipart, photo) |
| GET | `/api/events` | list events |
| POST | `/api/registrations` | register (free → QR; paid → order) |
| POST | `/api/payments/verify` | verify checkout signature |
| POST | `/api/payments/webhook` | Razorpay webhook (raw body) |
| POST | `/api/scan` | check-in by QR token (admin) |
| GET | `/api/badges/:id/pdf` | printable badge PDF |
| GET | `/api/admin/events/:id/attendees.csv` | export report |

## Security notes
- QR encodes an **opaque token**, never PII. Resolved server-side on scan.
- Razorpay signature verified on both client callback **and** webhook (source of truth).
- OTP hashed (bcrypt), TTL-expired, rate-limited, 5-attempt lockout.
- JWT required for all doctor/admin routes; admin role bootstrapped from `ADMIN_MOBILE`.
- Badge/QR endpoints restricted to the owner doctor or admin.

## Production TODO
- Wire a real SMS provider in `server/src/services/otp.service.js` (MSG91 / Twilio / SNS).
- Move uploads to S3 (currently local `server/uploads`).
- Schedule the "QR email 2–3 days before event" reminder job (cron / queue).
- Code-split the scanner bundle (`html5-qrcode` is large).

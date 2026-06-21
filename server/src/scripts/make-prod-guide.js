import PDFDocument from 'pdfkit';
import fs from 'fs';

// Generates a professional Production Readiness / Buying guide PDF.
// Run:  node src/scripts/make-prod-guide.js
const OUT = 'D:/Event Management system/MedEvents_Production_Guide.pdf';

const NAVY = '#0b1226';
const PANEL = '#121a33';
const BRAND = '#2f5bd0';
const ACCENT = '#3aa0ff';
const INK = '#1f2937';
const GREY = '#6b7280';
const LINE = '#e5e7eb';
const GREEN = '#15803d';
const AMBER = '#b45309';

const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PW = doc.page.width;       // 595.28
const PH = doc.page.height;      // 841.89
const M = 56;                    // content margin
const CW = PW - M * 2;           // content width
let y = M;

// ---------- helpers ----------
function ensure(space) {
  if (y + space > PH - 64) addPage();
}
function addPage() {
  doc.addPage();
  y = M;
  footer();
}
let pageNo = 0;
function footer() {
  pageNo += 1;
  const yy = PH - 40;
  doc.save();
  doc.fontSize(8).fillColor(GREY).font('Helvetica');
  doc.text('MedEvents — Production & Buying Guide', M, yy, { lineBreak: false });
  doc.text(`Page ${pageNo}`, PW - M - 60, yy, { width: 60, align: 'right', lineBreak: false });
  doc.restore();
}
function h1(t) {
  ensure(60);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(19).text(t, M, y);
  y = doc.y + 4;
  doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(2).strokeColor(ACCENT).stroke();
  y += 14;
}
function h2(t) {
  ensure(40);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(t, M, y);
  y = doc.y + 6;
}
function p(t, opts = {}) {
  ensure(30);
  doc.fillColor(opts.color || INK).font(opts.font || 'Helvetica').fontSize(opts.size || 10.5);
  doc.text(t, M, y, { width: CW, align: opts.align || 'left', lineGap: 2 });
  y = doc.y + (opts.gap ?? 8);
}
function bullet(t, color) {
  ensure(24);
  const x = M + 6;
  doc.circle(x, y + 5.5, 1.8).fill(color || ACCENT);
  doc.fillColor(INK).font('Helvetica').fontSize(10.5);
  doc.text(t, x + 10, y, { width: CW - 16, lineGap: 2 });
  y = doc.y + 5;
}
function tag(label, x, yy, bg, fg) {
  const w = doc.widthOfString(label) + 14;
  doc.roundedRect(x, yy, w, 16, 8).fill(bg);
  doc.fillColor(fg).font('Helvetica-Bold').fontSize(8).text(label, x + 7, yy + 4, { lineBreak: false });
  return w;
}
// simple table: cols = [{w, label}], rows = [[...]]
function table(cols, rows, opts = {}) {
  const startX = M;
  const rowPad = 6;
  const headH = 22;
  ensure(headH + 30);
  // header
  doc.rect(startX, y, CW, headH).fill(NAVY);
  let cx = startX;
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  cols.forEach((c) => {
    doc.text(c.label, cx + 6, y + 6, { width: c.w - 12, lineBreak: false });
    cx += c.w;
  });
  y += headH;
  // rows
  doc.font('Helvetica').fontSize(9);
  rows.forEach((r, i) => {
    // measure tallest cell
    let maxH = 0;
    cx = startX;
    cols.forEach((c, ci) => {
      const h = doc.heightOfString(String(r[ci] ?? ''), { width: c.w - 12, lineGap: 1 });
      if (h > maxH) maxH = h;
    });
    const rh = maxH + rowPad * 2;
    if (y + rh > PH - 64) { addPage(); }
    if (i % 2 === 0) doc.rect(startX, y, CW, rh).fill('#f5f7fb');
    cx = startX;
    doc.fillColor(INK).font('Helvetica').fontSize(9);
    cols.forEach((c, ci) => {
      const bold = ci === 0 && opts.boldFirst;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.fillColor(ci === cols.length - 1 && opts.lastColor ? opts.lastColor : INK);
      doc.text(String(r[ci] ?? ''), cx + 6, y + rowPad, { width: c.w - 12, lineGap: 1 });
      cx += c.w;
    });
    y += rh;
    doc.moveTo(startX, y).lineTo(startX + CW, y).lineWidth(0.5).strokeColor(LINE).stroke();
  });
  y += 12;
}
function callout(title, lines, bg, bar) {
  const innerW = CW - 28;
  doc.font('Helvetica').fontSize(10);
  let h = 16 + 18;
  lines.forEach((l) => { h += doc.heightOfString(l, { width: innerW, lineGap: 2 }) + 4; });
  ensure(h + 10);
  doc.roundedRect(M, y, CW, h, 8).fill(bg);
  doc.rect(M, y, 4, h).fill(bar);
  doc.fillColor(bar).font('Helvetica-Bold').fontSize(10.5).text(title, M + 16, y + 12);
  let yy = doc.y + 4;
  doc.fillColor(INK).font('Helvetica').fontSize(10);
  lines.forEach((l) => {
    doc.text(l, M + 16, yy, { width: innerW, lineGap: 2 });
    yy = doc.y + 4;
  });
  y += h + 14;
}

// ---------- COVER ----------
doc.rect(0, 0, PW, PH).fill(NAVY);
doc.rect(0, 0, PW, 260).fill(PANEL);
// brand chip
doc.roundedRect(M, 90, 170, 30, 15).fill(BRAND);
doc.fillColor('#fff').font('Helvetica-Bold').fontSize(12).text('⚡ MEDEVENTS', M + 14, 98, { lineBreak: false });
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(34).text('Production & Buying', M, 150, { width: CW });
doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(34).text('Guide', M, doc.y, { width: CW });
doc.fillColor('#9fb0d4').font('Helvetica').fontSize(13)
  .text('Everything to buy and set up to take the Event Portal from demo to live —\nhosting, domain, database, email, SMS, payments, security & costs.', M, doc.y + 12, { width: CW, lineGap: 4 });

// quick facts box
const by = 430;
doc.roundedRect(M, by, CW, 150, 12).fill(PANEL);
doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11).text('AT A GLANCE', M + 20, by + 18);
const facts = [
  ['Stack', 'React (Vite) + Node/Express + MongoDB'],
  ['Demo now', 'Free hosting, fake payments, Gmail mail'],
  ['For production', 'Paid hosting, real domain, transactional email, live payments'],
  ['Starter cost', '~ Rs 6,000 - 12,000 / year (small scale)'],
];
let fy = by + 44;
facts.forEach(([k, v]) => {
  doc.fillColor('#7e8db5').font('Helvetica-Bold').fontSize(9.5).text(k.toUpperCase(), M + 20, fy, { width: 110, lineBreak: false });
  doc.fillColor('#e7edff').font('Helvetica').fontSize(10).text(v, M + 140, fy, { width: CW - 160 });
  fy = doc.y + 8;
});
doc.fillColor('#5b6b95').font('Helvetica').fontSize(9)
  .text('Prepared for the MedEvents Event Management Portal • Keep this with your project docs.', M, PH - 70, { width: CW });

// ---------- PAGE: demo vs prod ----------
addPage();
h1('1. Demo vs Production — what actually changes');
p('The app code is the same. Going live means swapping demo shortcuts for paid, reliable services and flipping a few environment flags. Nothing needs to be rewritten.');
table(
  [{ w: 150, label: 'Area' }, { w: 195, label: 'Demo (now)' }, { w: CW - 345, label: 'Production' }],
  [
    ['Frontend host', 'Local / Vercel free', 'Vercel / Netlify / your VPS'],
    ['Backend host', 'Local / Render free', 'Render paid / VPS (Hostinger, DO, AWS)'],
    ['Database', 'Local MongoDB', 'MongoDB Atlas (paid tier) + backups'],
    ['Email', 'Gmail SMTP (App Password)', 'SendGrid / AWS SES / Resend + domain auth'],
    ['Payments', 'DEMO_MODE (fake Razorpay)', 'Razorpay LIVE keys (KYC done)'],
    ['SMS (optional)', 'On-screen demo code', 'Twilio / MSG91 if you want SMS OTP'],
    ['Domain', 'localhost / LAN IP', 'Your own domain + HTTPS'],
    ['Secrets', 'Sample values in .env', 'Strong unique secrets, never in git'],
  ],
  { boldFirst: true }
);
callout('Key flags to flip in server/.env', [
  'DEMO_MODE=false      (use real Razorpay)',
  'MAIL_TRANSPORT=smtp  (point to SendGrid/SES, not Gmail)',
  'OTP_DEV_MODE=false   (stop returning codes in the API response)',
  'NODE_ENV=production   • set a long random JWT_SECRET • set real PUBLIC_BASE_URL / CLIENT_URL',
], '#eef4ff', BRAND);

// ---------- PAGE: shopping list ----------
addPage();
h1('2. The shopping list (what to buy)');
p('Approx prices in INR for a small/medium event portal. You can start cheap and upgrade as traffic grows.');
table(
  [{ w: 120, label: 'What' }, { w: 150, label: 'Recommended' }, { w: 120, label: 'Approx cost' }, { w: CW - 390, label: 'Needed?' }],
  [
    ['Domain name', 'Namecheap / GoDaddy / Hostinger', 'Rs 700 - 1,200 / yr', 'Yes'],
    ['Frontend hosting', 'Vercel (free) or Netlify', 'Free - Rs 1,700/mo', 'Yes'],
    ['Backend hosting', 'Render / Railway, or a VPS', 'Rs 600 - 1,500 / mo', 'Yes'],
    ['VPS (alt. to above)', 'Hostinger / DigitalOcean / AWS Lightsail', 'Rs 350 - 900 / mo', 'Optional'],
    ['Database', 'MongoDB Atlas M0 free -> M10', 'Free - Rs 4,800/mo', 'Yes'],
    ['Transactional email', 'SendGrid / AWS SES / Resend', 'Free tier - Rs 1,200/mo', 'Yes'],
    ['SMS gateway', 'Twilio / MSG91 / Fast2SMS', 'Pay per SMS (~Rs 0.15-3)', 'Optional'],
    ['Payment gateway', 'Razorpay (live)', '2% per txn, no monthly', 'If paid events'],
    ['SSL certificate', "Let's Encrypt (free) / host-provided", 'Free', 'Yes'],
    ['Error monitoring', 'Sentry / UptimeRobot', 'Free tier', 'Recommended'],
  ],
  { boldFirst: true, lastColor: BRAND }
);
callout('Cheapest viable go-live', [
  'Domain (Rs ~1,000/yr) + Vercel (free frontend) + Render free/starter backend +',
  'MongoDB Atlas free M0 + SendGrid free (100 mails/day) + Razorpay (pay per txn).',
  'Total: a domain fee + ~Rs 0-600/mo. Upgrade pieces only when you outgrow them.',
], '#ecfdf3', GREEN);

// ---------- PAGE: domain + hosting ----------
addPage();
h1('3. Domain, hosting & the two paths');
h2('A. Domain name');
bullet('Buy from Namecheap, GoDaddy, Google Domains, or Hostinger. Pick a .com / .in / .health.');
bullet('You will point DNS records to your frontend host and backend (A / CNAME records).');
bullet('Domain also needed for proper email (SPF/DKIM) and a trusted HTTPS certificate.');
y += 4;
h2('B. Hosting — pick ONE path');
p('Path 1 — PaaS (managed, easiest). You push code; the platform builds, runs, gives HTTPS.', { font: 'Helvetica-Bold' });
bullet('Frontend: Vercel or Netlify (free, great for React/Vite).');
bullet('Backend: Render or Railway (auto-deploy from GitHub, free tier to start).');
bullet('Best when: you want fast setup, no server admin. Recommended for you.');
y += 2;
p('Path 2 — VPS (full control). One Linux server you manage yourself.', { font: 'Helvetica-Bold' });
bullet('Providers: Hostinger VPS, DigitalOcean, AWS Lightsail/EC2, Linode.');
bullet('You install Node, Nginx (reverse proxy + HTTPS via Certbot), PM2 (keep app running).');
bullet('Cheaper at scale and flexible, but you handle updates, security, uptime.');
callout('Recommendation', [
  'Start on the PaaS path: Vercel (frontend) + Render (backend) + MongoDB Atlas.',
  'Move to a VPS only when traffic/cost makes it worth managing a server yourself.',
], '#fff7ed', AMBER);

// ---------- PAGE: database + email ----------
addPage();
h1('4. Database & Email (the two that bite people)');
h2('Database — MongoDB Atlas');
bullet('Use MongoDB Atlas (cloud). M0 tier is free for the demo / small data.');
bullet('For production upgrade to M10+ : automated backups, more storage, better uptime.');
bullet('Whitelist your backend host IP, create a DB user, use the SRV connection string in MONGO_URI.');
bullet('Turn ON automated backups. Test a restore once before the real event.');
y += 4;
h2('Email — STOP using Gmail in production');
p('Gmail App Passwords are fine for a demo but get rate-limited and flagged as spam for bulk/real sending. Use a transactional email service.');
table(
  [{ w: 130, label: 'Service' }, { w: 150, label: 'Free tier' }, { w: CW - 280, label: 'Notes' }],
  [
    ['SendGrid', '100 emails/day free', 'Popular, easy SMTP + API'],
    ['AWS SES', '~Rs cheap per 1000', 'Cheapest at scale, needs setup'],
    ['Resend', '3,000/mo free', 'Modern, developer-friendly'],
    ['Brevo / Mailgun', 'Free tiers', 'Good alternatives'],
  ],
  { boldFirst: true }
);
callout('Email deliverability — do this or mails hit SPAM', [
  '1) Verify your domain in the email service.',
  '2) Add SPF, DKIM and DMARC DNS records (the service gives you the values).',
  '3) Send "from" your domain (e.g. no-reply@yourevents.com), not a gmail address.',
  '4) Warm up gradually; avoid identical bulk blasts on day one.',
], '#eef4ff', BRAND);

// ---------- PAGE: SMS + payments ----------
addPage();
h1('5. SMS (Twilio) & Payments (Razorpay)');
h2('SMS — only if you want phone OTP / reminders');
p('Your portal already verifies by EMAIL code, so SMS is OPTIONAL. Add it only if you want SMS OTP or text reminders.');
bullet('Twilio — global, reliable; pay per SMS. Needs a sender ID / number.');
bullet('India-focused & cheaper: MSG91, Fast2SMS, Gupshup. For Indian numbers + DLT compliance.');
bullet('Note: Indian SMS needs DLT registration of sender ID & templates (TRAI rule).');
y += 4;
h2('Payments — Razorpay live');
bullet('Complete Razorpay KYC (business proof, bank account) to get LIVE keys.');
bullet('Set RAZORPAY_KEY_ID / KEY_SECRET (live) and RAZORPAY_WEBHOOK_SECRET in env.');
bullet('Set DEMO_MODE=false so the real checkout + signature verification run.');
bullet('Configure the webhook URL in Razorpay dashboard -> your backend /api/payments/webhook.');
bullet('Razorpay charges ~2% per transaction; no monthly fee. GST applies.');
callout('Money safety', [
  'Never expose KEY_SECRET in the frontend. It lives only in backend env.',
  'Always verify the payment signature on the server before marking a registration paid.',
  'Reconcile via webhooks — do not trust only the browser callback.',
], '#fff7ed', AMBER);

// ---------- PAGE: security + go-live ----------
addPage();
h1('6. Security checklist (before go-live)');
bullet('Strong unique JWT_SECRET (long random string). Rotate the demo Gmail password.');
bullet('All secrets in host environment variables — never commit .env to git.');
bullet('HTTPS everywhere (host-provided or Lets Encrypt). Force https redirects.');
bullet('Lock CORS to your real domain (already wired via CLIENT_URL in production).');
bullet('Keep rate-limiting on /api/auth and registration endpoints (already added).');
bullet('OTP_DEV_MODE=false so verification codes are NOT returned in API responses.');
bullet('Protect the public check-in endpoint with a staff token at a real event.');
bullet('Enable DB backups + an uptime monitor (UptimeRobot) + error tracking (Sentry).');
bullet('Set up a separate staff/scanner login (non-admin) for kiosk devices.');

y += 6;
h1('7. Go-live checklist');
const steps = [
  'Buy domain + point DNS.',
  'Deploy backend (Render/VPS) with production env vars.',
  'Deploy frontend (Vercel) with VITE_API_URL = backend URL.',
  'MongoDB Atlas paid tier + backups + IP allowlist.',
  'Switch email to SendGrid/SES + verify domain (SPF/DKIM/DMARC).',
  'Razorpay KYC done, live keys set, DEMO_MODE=false, webhook configured.',
  'Set OTP_DEV_MODE=false, NODE_ENV=production, strong JWT_SECRET.',
  'Test full flow on the live domain: register -> code -> pay -> details mail -> scan check-in.',
  'Add monitoring + backups + staff scanner login.',
];
steps.forEach((s, i) => {
  ensure(22);
  doc.roundedRect(M, y, 18, 18, 4).fill(BRAND);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text(String(i + 1), M, y + 4, { width: 18, align: 'center' });
  doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(s, M + 28, y + 3, { width: CW - 28 });
  y = Math.max(doc.y, y + 18) + 8;
});

callout('Bottom line', [
  'Minimum to go live: a domain, a host for frontend + backend, MongoDB Atlas,',
  'a transactional email service, and (if charging) Razorpay live keys.',
  'SMS/Twilio and a VPS are optional upgrades, not requirements.',
], '#ecfdf3', GREEN);

// finalize footers on first page too
doc.flushPages();
doc.end();
console.log('[prod-guide] wrote', OUT);

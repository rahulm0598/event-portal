import PDFKit from 'pdfkit';
import fs from 'node:fs';

const OUT = 'D:/Event Management system/MedEvents_Deployment_Guide.pdf';

const NAVY = '#1b2a6b';
const BLUE = '#2f5bd0';
const ACCENT = '#3aa0ff';
const INK = '#0f172a';
const GREY = '#64748b';
const LIGHT = '#eef2ff';
const CODEBG = '#0d1226';
const CODEFG = '#9ad0ff';

const doc = new PDFKit({ size: 'A4', margin: 0, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;       // 595.28
const H = doc.page.height;      // 841.89
const MX = 50;                  // content margin
const CW = W - MX * 2;
let y = 0;

function ensure(space) {
  if (y + space > H - 60) addPage();
}
function addPage() {
  doc.addPage({ size: 'A4', margin: 0 });
  pageHeaderBand();
  y = 90;
}
function pageHeaderBand() {
  doc.rect(0, 0, W, 6).fill(BLUE);
  doc.fillColor(GREY).font('Helvetica').fontSize(8)
    .text('MedEvents — Free Deployment Guide', MX, 22, { width: CW, align: 'left' });
  doc.fillColor(GREY).text('github · atlas · render · vercel', MX, 22, { width: CW, align: 'right' });
  doc.moveTo(MX, 40).lineTo(W - MX, 40).strokeColor('#e2e8f0').lineWidth(1).stroke();
}

function h1(t) {
  ensure(40);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(16).text(t, MX, y);
  y = doc.y + 6;
  doc.moveTo(MX, y).lineTo(MX + 40, y).lineWidth(3).strokeColor(ACCENT).stroke();
  y += 12;
}
function para(t) {
  ensure(30);
  doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(t, MX, y, { width: CW, lineGap: 2 });
  y = doc.y + 8;
}
function bullet(t) {
  ensure(20);
  doc.circle(MX + 3, y + 6, 2).fill(BLUE);
  doc.fillColor(INK).font('Helvetica').fontSize(10).text(t, MX + 14, y, { width: CW - 14, lineGap: 2 });
  y = doc.y + 5;
}
function code(lines) {
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = 13;
  const padTop = 10;
  const boxH = arr.length * lh + padTop * 2;
  ensure(boxH + 8);
  doc.roundedRect(MX, y, CW, boxH, 8).fill(CODEBG);
  doc.font('Courier').fontSize(9).fillColor(CODEFG);
  arr.forEach((ln, i) => doc.text(ln, MX + 14, y + padTop + i * lh, { width: CW - 28 }));
  y += boxH + 10;
}
function note(t) {
  ensure(34);
  const boxH = doc.heightOfString(t, { width: CW - 28, fontSize: 9 }) + 16;
  doc.roundedRect(MX, y, CW, boxH, 6).fill('#fff7ed');
  doc.roundedRect(MX, y, 4, boxH, 2).fill('#f59e0b');
  doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(8.5).text('NOTE', MX + 14, y + 8);
  doc.fillColor('#7c2d12').font('Helvetica').fontSize(9).text(t, MX + 50, y + 8, { width: CW - 64, lineGap: 1.5 });
  y += boxH + 10;
}
function stepBadge(n, title) {
  ensure(44);
  doc.roundedRect(MX, y, CW, 34, 8).fill(LIGHT);
  doc.circle(MX + 22, y + 17, 13).fill(BLUE);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(12).text(String(n), MX + 13, y + 11, { width: 18, align: 'center' });
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12.5).text(title, MX + 46, y + 10);
  y += 46;
}

// ---------- COVER ----------
doc.rect(0, 0, W, H).fill(NAVY);
doc.rect(0, 0, W, H).fill(NAVY);
// gradient-ish bands
doc.rect(0, 0, W, 320).fill(NAVY);
const g = doc.linearGradient(0, 0, W, 360);
g.stop(0, NAVY).stop(1, BLUE);
doc.rect(0, 0, W, 360).fill(g);
doc.circle(W - 60, 80, 120).fillOpacity(0.15).fill(ACCENT).fillOpacity(1);
doc.circle(70, 300, 90).fillOpacity(0.12).fill(ACCENT).fillOpacity(1);

doc.fillColor('#cfe0ff').font('Helvetica-Bold').fontSize(11).text('EVENT MANAGEMENT PORTAL', MX, 150, { characterSpacing: 3 });
doc.fillColor('#fff').font('Helvetica-Bold').fontSize(34).text('Free Deployment', MX, 180);
doc.fillColor('#fff').font('Helvetica-Bold').fontSize(34).text('Guide', MX, 220);
doc.fillColor('#9fb8ff').font('Helvetica').fontSize(12)
  .text('Step-by-step: push to GitHub, host the database, backend & frontend — entirely on free tiers.', MX, 275, { width: CW - 120, lineGap: 3 });

// stack chips
let cx = MX;
const chips = ['GitHub', 'MongoDB Atlas', 'Render', 'Vercel'];
doc.fontSize(9).font('Helvetica-Bold');
chips.forEach((c) => {
  const w = doc.widthOfString(c) + 22;
  doc.roundedRect(cx, 330, w, 22, 11).fillOpacity(0.18).fill('#ffffff').fillOpacity(1);
  doc.fillColor('#ffffff').text(c, cx + 11, 336);
  cx += w + 8;
});

// white lower panel
doc.rect(0, 380, W, H - 380).fill('#ffffff');
doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text('What you will deploy', MX, 410);
const rows = [
  ['Frontend', 'React + Vite + Tailwind', 'Vercel (free)'],
  ['Backend', 'Node.js + Express API', 'Render (free)'],
  ['Database', 'MongoDB', 'Atlas M0 (free)'],
  ['Email', 'Gmail SMTP (Nodemailer)', 'free'],
  ['Payment', 'Razorpay — DEMO mode', 'fake, no money'],
];
let ry = 435;
rows.forEach((r, i) => {
  if (i % 2 === 0) doc.rect(MX, ry - 3, CW, 24).fill('#f8fafc');
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(r[0], MX + 8, ry + 2, { width: 110 });
  doc.fillColor(GREY).font('Helvetica').fontSize(9.5).text(r[1], MX + 120, ry + 2, { width: 230 });
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9.5).text(r[2], MX + 355, ry + 2, { width: CW - 360, align: 'right' });
  ry += 24;
});
doc.fillColor(GREY).font('Helvetica-Oblique').fontSize(9)
  .text('Everything stays in demo mode (fake payment, real email). Free tiers only. ~30-40 min total.', MX, ry + 14, { width: CW });
doc.fillColor('#94a3b8').fontSize(8).text('MedEvents Portal  ·  Deployment Guide', MX, H - 50, { width: CW, align: 'center' });

// ---------- BODY ----------
addPage();

h1('Before you start');
para('Create these free accounts first (use "Sign in with GitHub" where possible). No credit card needed for any of them.');
bullet('GitHub  —  stores your code  (github.com)');
bullet('MongoDB Atlas  —  the cloud database  (atlas.mongodb.com)');
bullet('Render  —  hosts the backend API  (render.com)');
bullet('Vercel  —  hosts the website  (vercel.com)');
note('Follow the steps in order. Backend must be live before the frontend, because the frontend needs the backend URL.');

stepBadge(0, 'Push your code to GitHub');
para('In the project folder, run:');
code([
  'git init',
  'git add -A',
  'git commit -m "Event portal demo"',
]);
para('Create a new PRIVATE repo on github.com named "event-portal", then connect and push:');
code([
  'git remote add origin https://github.com/<you>/event-portal.git',
  'git branch -M main',
  'git push -u origin main',
]);
note('Your .env files (with the Gmail password) are git-ignored — they will NOT be uploaded. Safe.');

stepBadge(1, 'Database — MongoDB Atlas');
bullet('Sign up, then create a free M0 cluster (pick a region near you).');
bullet('Database Access -> Add User: username "eventadmin", set a password (save it), role Read/Write.');
bullet('Network Access -> Add IP -> Allow from anywhere (0.0.0.0/0). Needed so Render can connect.');
bullet('Connect -> Drivers -> copy the connection string. Add your password and /event_portal:');
code('mongodb+srv://eventadmin:<password>@cluster0.xxxx.mongodb.net/event_portal');
para('Keep this string — it is your MONGO_URI.');

stepBadge(2, 'Backend — Render');
bullet('New + -> Web Service -> connect the event-portal repo.');
bullet('Root Directory: server');
bullet('Build Command: npm install');
bullet('Start Command: npm start');
bullet('Instance Type: Free');
para('Add these Environment Variables:');
code([
  'NODE_ENV=production',
  'MONGO_URI=<your atlas string>',
  'JWT_SECRET=<any long random text>',
  'DEMO_MODE=true',
  'MAIL_TRANSPORT=smtp',
  'SMTP_HOST=smtp.gmail.com',
  'SMTP_PORT=587',
  'SMTP_USER=<your gmail>',
  'SMTP_PASS=<gmail app password>',
  'MAIL_FROM=MedEvents <your gmail>',
  'OTP_DEV_MODE=true',
  'ADMIN_EMAIL=admin@medevents.test',
  'ADMIN_PASSWORD=admin123',
]);
para('Create the service. After build you get a URL like https://event-portal-xxx.onrender.com — save it (this is the BACKEND URL). CLIENT_URL and PUBLIC_BASE_URL are added in Step 5.');

stepBadge(3, 'Seed the database (one time)');
para('Render free has no shell, so seed from your laptop into Atlas. In server/.env set MONGO_URI to the Atlas string, then run:');
code(['cd server', 'npm run seed']);
para('This creates the 6 sample events and the admin account inside Atlas.');

stepBadge(4, 'Frontend — Vercel');
bullet('Add New -> Project -> import the event-portal repo.');
bullet('Root Directory: client');
bullet('Framework: Vite (auto-detected). Build: npm run build. Output: dist');
para('Add Environment Variable (your Render URL from Step 2):');
code('VITE_API_URL=https://event-portal-xxx.onrender.com');
para('Deploy -> you get https://event-portal-xxx.vercel.app — this is your LIVE SITE.');

stepBadge(5, 'Link them together (CORS + QR)');
para('Go back to Render -> Environment and add two more variables (your Vercel URL):');
code([
  'CLIENT_URL=https://event-portal-xxx.vercel.app',
  'PUBLIC_BASE_URL=https://event-portal-xxx.vercel.app',
]);
para('Save -> Render redeploys. CLIENT_URL lets the backend accept the website (CORS). PUBLIC_BASE_URL makes the QR code open the website check-in page over HTTPS — so phone cameras can scan it.');

stepBadge(6, 'Test the live demo');
bullet('Open your Vercel URL on any device (phone or laptop).');
bullet('Sign up -> email verification code (shown on screen + sent to inbox).');
bullet('Pick a paid event -> fake Razorpay -> QR ticket emailed.');
bullet('Open the email on a phone -> scan the QR with another phone -> check-in page loads.');
bullet('Admin login: admin@medevents.test / admin123 -> dashboard, exports, scanner.');

h1('Good to know');
note('Render free sleeps after ~15 minutes idle. The first request then takes 30-50 seconds to wake, after which it is fast. Open the backend URL once before a live demo to wake it.');
bullet('Every "git push" auto-redeploys both Render and Vercel.');
bullet('HTTPS is automatic on both — phone camera scanning works with no tunnel.');
bullet('Atlas free = 512 MB, more than enough for a demo.');
bullet('Still 100% demo: fake payment, real email, on-screen verification codes.');

h1('Quick reference — environment variables');
para('Backend (Render):');
code([
  'NODE_ENV, MONGO_URI, JWT_SECRET, DEMO_MODE=true,',
  'MAIL_TRANSPORT=smtp, SMTP_HOST, SMTP_PORT, SMTP_USER,',
  'SMTP_PASS, MAIL_FROM, OTP_DEV_MODE=true,',
  'ADMIN_EMAIL, ADMIN_PASSWORD, CLIENT_URL, PUBLIC_BASE_URL',
]);
para('Frontend (Vercel):');
code('VITE_API_URL=<render backend url>');

// page numbers
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i);
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
    .text(`Page ${i} of ${range.count - 1}`, MX, H - 30, { width: CW, align: 'center' });
}

doc.end();
console.log('PDF written:', OUT);

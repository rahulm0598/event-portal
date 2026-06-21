import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];
for (const k of required) {
  if (!process.env[k]) {
    // eslint-disable-next-line no-console
    console.warn(`[env] WARNING: ${k} is not set. Check server/.env`);
  }
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // DEMO_MODE=true => no real payment gateway. Paid events are auto-confirmed
  // (marked "paid") so the QR + email + badge flow can be shown end-to-end
  // without Razorpay keys or real money. Turn OFF for production.
  demoMode: process.env.DEMO_MODE === 'true',

  // Which email transport to use:
  //   'ethereal' = fake inbox, prints a preview URL (best for demo, no signup)
  //   'smtp'     = real SMTP (SES/SendGrid/Mailtrap) using SMTP_* vars
  //   'console'  = just log, send nothing
  mailTransport: process.env.MAIL_TRANSPORT || 'ethereal',

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/event_portal',

  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  otpTtl: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  otpDevMode: process.env.OTP_DEV_MODE !== 'false',

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Event Portal <no-reply@example.com>',
  },

  // Base URL the QR code points to. Phones scanning the QR open
  // `${publicBaseUrl}/checkin/<token>`. For a LAN demo set this to your
  // laptop IP, e.g. http://192.168.1.5:5173 (no HTTPS needed — just opens a page).
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173',

  adminMobile: process.env.ADMIN_MOBILE || '',
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase(),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxPhotoMb: parseInt(process.env.MAX_PHOTO_MB || '5', 10),
};

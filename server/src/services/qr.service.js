import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

// Opaque token stored on the registration (no PII in it).
export function generateQrToken() {
  return `EVT-${nanoid(20)}`;
}

// The QR encodes a URL so ANY phone camera that scans it opens the public
// check-in page directly: `${publicBaseUrl}/checkin/<token>`.
export function checkinUrl(token) {
  return `${env.publicBaseUrl.replace(/\/$/, '')}/checkin/${token}`;
}

// Given whatever a scanner produced (full URL or raw token), return the token.
export function extractToken(scanned) {
  if (!scanned) return '';
  const s = String(scanned).trim();
  if (s.includes('/checkin/')) {
    return s.split('/checkin/')[1].split(/[?#]/)[0];
  }
  return s;
}

// PNG data URL — used in emails and on-screen.
export async function qrToDataUrl(token) {
  return QRCode.toDataURL(checkinUrl(token), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
}

// Raw PNG buffer — used by PDFKit (badge) and email attachment.
export async function qrToBuffer(token) {
  return QRCode.toBuffer(checkinUrl(token), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
}

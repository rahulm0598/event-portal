import PDFKit from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { qrToBuffer } from './qr.service.js';

/**
 * Generates a portrait ID-card badge PDF that matches the supplied design:
 *  - blue gradient top band with logo + company/event name
 *  - circular photo in the center
 *  - NAME SURNAME in large caps
 *  - specialty + hospital subtitle
 *  - QR code at the bottom
 *
 * Card size: standard portrait ID badge ~ 54mm x 85.6mm scaled up for print.
 * We use points (1pt = 1/72 inch). Card = 153.07 x 242.65 pt (CR80 portrait).
 * Scaled x2 for crisp printing.
 */
const SCALE = 2;
const W = 153.07 * SCALE;
const H = 242.65 * SCALE;

const NAVY = '#1b2a6b';
const BLUE = '#2f5bd0';
const ACCENT = '#3aa0ff';
const GREY = '#9aa3b2';
const DARK = '#222a3a';

function roundedClipCircle(doc, cx, cy, r) {
  doc.save();
  doc.circle(cx, cy, r).clip();
}

export async function buildBadgePdf(registration) {
  const s = registration.snapshot || {};
  const qrBuf = await qrToBuffer(registration.qrToken);

  const doc = new PDFKit({ size: [W, H], margin: 0 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // --- Background ---
  doc.rect(0, 0, W, H).fill('#ffffff');

  // --- Top gradient band (blue wave) ---
  const grad = doc.linearGradient(0, 0, W, H * 0.55);
  grad.stop(0, NAVY).stop(0.6, BLUE).stop(1, ACCENT);
  doc.rect(0, 0, W, H * 0.55).fill(grad);

  // soft white wave divider
  doc.save();
  doc.moveTo(0, H * 0.5);
  doc.bezierCurveTo(W * 0.3, H * 0.58, W * 0.7, H * 0.46, W, H * 0.54);
  doc.lineTo(W, H);
  doc.lineTo(0, H);
  doc.closePath().fill('#ffffff');
  doc.restore();

  // --- Logo / company name (top) ---
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(11 * SCALE)
    .text((registration._eventLogoText || 'EVENT PORTAL').toUpperCase(), 0, 26 * SCALE, {
      width: W,
      align: 'center',
      characterSpacing: 1.5,
    });
  doc
    .font('Helvetica')
    .fontSize(5.5 * SCALE)
    .fillColor('#dbe6ff')
    .text('MEDICAL CONFERENCE ID', 0, 40 * SCALE, {
      width: W,
      align: 'center',
      characterSpacing: 3,
    });

  // --- Photo circle (center) ---
  const cx = W / 2;
  const cy = H * 0.45;
  const r = 38 * SCALE;

  // outer white ring
  doc.circle(cx, cy, r + 5).fill('#ffffff');
  doc.circle(cx, cy, r + 2).lineWidth(2).stroke('#e3e9f5');

  const photoPath = s.photo ? path.resolve(s.photo) : null;
  if (photoPath && fs.existsSync(photoPath)) {
    roundedClipCircle(doc, cx, cy, r);
    try {
      doc.image(photoPath, cx - r, cy - r, { width: r * 2, height: r * 2, align: 'center', valign: 'center' });
    } catch {
      doc.circle(cx, cy, r).fill('#dfe6f5');
    }
    doc.restore();
  } else {
    doc.circle(cx, cy, r).fill('#dfe6f5');
    doc
      .fillColor('#9fb0d4')
      .font('Helvetica-Bold')
      .fontSize(20 * SCALE)
      .text((s.name || '?').charAt(0).toUpperCase(), cx - r, cy - 14 * SCALE, {
        width: r * 2,
        align: 'center',
      });
  }

  // --- Name ---
  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(12 * SCALE)
    .text((s.name || 'NAME SURNAME').toUpperCase(), 0, cy + r + 12 * SCALE, {
      width: W,
      align: 'center',
      characterSpacing: 0.5,
    });

  // --- Subtitle: specialty + hospital ---
  const subtitle = [s.specialty, s.hospital].filter(Boolean).join(' • ') || 'Delegate';
  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(6.5 * SCALE)
    .text(subtitle.toUpperCase(), 0, cy + r + 30 * SCALE, {
      width: W,
      align: 'center',
      characterSpacing: 1,
    });

  // doctor id chip
  if (s.doctorId) {
    doc
      .fillColor(BLUE)
      .font('Helvetica-Bold')
      .fontSize(6 * SCALE)
      .text(`ID: ${s.doctorId}`, 0, cy + r + 42 * SCALE, { width: W, align: 'center' });
  }

  // --- QR (bottom) ---
  const qrSize = 46 * SCALE;
  doc.image(qrBuf, cx - qrSize / 2, H - qrSize - 14 * SCALE, { width: qrSize, height: qrSize });

  doc.end();
  return done;
}

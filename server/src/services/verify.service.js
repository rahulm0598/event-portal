import bcrypt from 'bcryptjs';
import { EmailCode } from '../models/EmailCode.js';
import { sendMail, verificationEmailHtml } from './email.service.js';
import { env } from '../config/env.js';
import { badRequest, unauthorized } from '../utils/ApiError.js';

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Create a fresh code, email it, return devCode in demo so UI can show it.
export async function issueEmailCode(email, name) {
  const code = gen6();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + env.otpTtl * 1000);

  await EmailCode.findOneAndUpdate(
    { email },
    { email, codeHash, expiresAt, attempts: 0 },
    { upsert: true }
  );

  // eslint-disable-next-line no-console
  console.log(`[verify] email=${email} code=${code}`);

  await sendMail({
    to: email,
    subject: 'Your Event Portal verification code',
    html: verificationEmailHtml({ name: name || 'Doctor', code }),
  }).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[verify] email send failed:', e.message);
  });

  // In demo, also surface the code via API so the UI can autofill/show it.
  return env.otpDevMode ? { devCode: code } : {};
}

export async function verifyEmailCode(email, code) {
  const rec = await EmailCode.findOne({ email });
  if (!rec) throw unauthorized('Code expired or not requested');
  if (rec.attempts >= 5) {
    await rec.deleteOne();
    throw unauthorized('Too many attempts. Request a new code');
  }
  const ok = await bcrypt.compare(String(code), rec.codeHash);
  if (!ok) {
    rec.attempts += 1;
    await rec.save();
    throw badRequest('Invalid code');
  }
  await rec.deleteOne();
  return true;
}

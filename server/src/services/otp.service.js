import bcrypt from 'bcryptjs';
import { Otp } from '../models/Otp.js';
import { env } from '../config/env.js';
import { badRequest, unauthorized } from '../utils/ApiError.js';

function genCode() {
  // 6-digit OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueOtp(mobile) {
  const code = genCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + env.otpTtl * 1000);

  // replace any existing OTP for this mobile
  await Otp.findOneAndUpdate(
    { mobile },
    { mobile, codeHash, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  if (env.otpDevMode) {
    // eslint-disable-next-line no-console
    console.log(`[otp] DEV mobile=${mobile} code=${code}`);
  } else {
    // TODO: wire SMS provider (MSG91 / Twilio / AWS SNS) here
  }

  return env.otpDevMode ? { devCode: code } : {};
}

export async function verifyOtp(mobile, code) {
  const record = await Otp.findOne({ mobile });
  if (!record) throw unauthorized('OTP expired or not requested');
  if (record.attempts >= 5) {
    await record.deleteOne();
    throw unauthorized('Too many attempts. Request a new OTP');
  }
  const ok = await bcrypt.compare(String(code), record.codeHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    throw badRequest('Invalid OTP');
  }
  await record.deleteOne();
  return true;
}
